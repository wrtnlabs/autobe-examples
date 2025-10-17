import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that a member can upvote and downvote an existing comment, applying all
 * business rules:
 *
 * - Only authenticated members can vote (unauthenticated must be rejected)
 * - Only one vote per member per comment (idempotent)
 * - Upvote then downvote should update the same vote
 * - Cannot vote own comment
 * - Returns error for duplicate votes and for forbidden actions
 */
export async function test_api_comment_vote_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register new member (actor)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals("member email matches input", member.email, memberEmail);

  // 2. Create new community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communitySlug = communityName;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community was created by member",
    community.creator_member_id,
    member.id,
  );

  // 3. Create new post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_type: "text",
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        // status omitted (system default)
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals(
    "post assigned to correct community",
    post.community_platform_community_id,
    community.id,
  );

  // 4. Create comment on post as member
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          body: RandomGenerator.content({ paragraphs: 1 }),
          // parent_id omitted: top-level
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment assigned to correct post",
    comment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment authored by member",
    comment.community_platform_member_id,
    member.id,
  );

  // 5. UPVOTE comment (+1) by the author (should fail as user can't vote own comment)
  await TestValidator.error("member cannot upvote own comment", async () => {
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: 1,
          comment_id: comment.id,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  });

  // ----
  // 6. Register second member to cast legitimate votes
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = RandomGenerator.alphaNumeric(13);
  const voter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: voterEmail,
        password: voterPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(voter);
  TestValidator.notEquals(
    "second member has different id",
    voter.id,
    member.id,
  );

  // 7. UPVOTE comment by second member (allowed)
  const voteUp: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: 1,
          comment_id: comment.id,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteUp);
  TestValidator.equals(
    "vote refers correct member",
    voteUp.community_platform_member_id,
    voter.id,
  );
  TestValidator.equals(
    "vote refers correct comment",
    voteUp.community_platform_comment_id,
    comment.id,
  );
  TestValidator.equals("vote value is upvote", voteUp.vote_value, 1);

  // 8. DUPLICATE UPVOTE (should not create new vote, must not fail, idempotency)
  const voteUpDuplicate: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: 1,
          comment_id: comment.id,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteUpDuplicate);
  TestValidator.equals(
    "duplicate upvote returns same member id",
    voteUpDuplicate.community_platform_member_id,
    voter.id,
  );
  TestValidator.equals(
    "duplicate upvote for correct comment",
    voteUpDuplicate.community_platform_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "duplicate upvote, still value 1",
    voteUpDuplicate.vote_value,
    1,
  );
  TestValidator.equals(
    "only one vote record id",
    voteUpDuplicate.id,
    voteUp.id,
  );

  // 9. DOWNVOTE: Switch vote to -1 (should update value, not create new record)
  const voteDown: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: -1,
          comment_id: comment.id,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteDown);
  TestValidator.equals("vote entry same (updated)", voteDown.id, voteUp.id);
  TestValidator.equals("vote now is downvote", voteDown.vote_value, -1);
  TestValidator.equals(
    "vote refers correct member (downvote)",
    voteDown.community_platform_member_id,
    voter.id,
  );

  // 10. DOWNVOTE again (duplicate, still idempotent)
  const voteDownDuplicate: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: -1,
          comment_id: comment.id,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteDownDuplicate);
  TestValidator.equals(
    "duplicate downvote entry has same id",
    voteDownDuplicate.id,
    voteDown.id,
  );
  TestValidator.equals(
    "duplicate downvote value still -1",
    voteDownDuplicate.vote_value,
    -1,
  );

  // 11. As second member, try voting on a non-existent comment (should be error)
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "voting on non-existent comment fails",
    async () => {
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: fakeCommentId,
          body: {
            vote_value: 1,
            comment_id: fakeCommentId,
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    },
  );

  // 12. As unauthenticated user, try to vote (should be rejected)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user cannot vote", async () => {
    await api.functional.communityPlatform.member.comments.votes.create(
      unauthConn,
      {
        commentId: comment.id,
        body: {
          vote_value: 1,
          comment_id: comment.id,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  });
}
