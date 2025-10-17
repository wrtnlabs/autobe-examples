import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * End-to-end validation that an admin user can retrieve the full detail of a
 * comment vote for audit, and access control is enforced.
 *
 * Workflow in detail:
 *
 * 1. Register an admin user and authenticate as admin (acquire/admin token).
 * 2. Register Member A; create new community and post; add comment to post.
 * 3. Register Member B; vote on Member A's comment (voteId is captured).
 * 4. Switch to admin context, retrieve comment vote detail using {commentId,
 *    voteId} and assert that the vote identity, value, and timestamps are
 *    present and match (audit trace).
 * 5. Validate error case: a non-admin (regular member) cannot access the detailed
 *    vote API and receives a 403 forbidden error.
 * 6. Validate 404 not found: admin queries a voteId/commentId that does not exist
 *    (random UUIDs).
 */
export async function test_api_admin_comment_vote_detail_for_audit_and_abuse(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin!234",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register Member A (community creator) and context switch
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: "MemberA!234",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberA);
  // Create community as Member A
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post in community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Add comment to post
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Register Member B (as independent voter)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: "MemberB!234",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberB);
  // Member B votes on comment (random upvote/downvote)
  const voteValue: 1 | -1 = RandomGenerator.pick([1, -1] as const);
  const vote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: voteValue,
          comment_id: comment.id,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);

  // 4. Switch to admin context and get vote audit detail
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin!234",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const detail = await api.functional.communityPlatform.admin.comments.votes.at(
    connection,
    {
      commentId: comment.id,
      voteId: vote.id,
    },
  );
  typia.assert(detail);
  // Validate audit fields
  TestValidator.equals(
    "vote identity matches voter",
    detail.community_platform_member_id,
    memberB.id,
  );
  TestValidator.equals(
    "vote value matches what was cast",
    detail.vote_value,
    voteValue,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );
  // Deleted_at is optional/null, assert appropriately

  // 5. Validate forbidden access for non-admin
  // Switch context to Member A (regular member)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: "MemberA!234",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "regular member cannot get audit vote detail (forbidden)",
    async () => {
      await api.functional.communityPlatform.admin.comments.votes.at(
        connection,
        {
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 6. Validate 404 (not found) error for invalid vote id
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin!234",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  const randomVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin receives 404 when retrieving nonexistent vote",
    async () => {
      await api.functional.communityPlatform.admin.comments.votes.at(
        connection,
        {
          commentId: randomCommentId,
          voteId: randomVoteId,
        },
      );
    },
  );
}
