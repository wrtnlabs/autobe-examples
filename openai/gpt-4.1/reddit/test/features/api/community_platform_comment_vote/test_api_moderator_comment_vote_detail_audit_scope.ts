import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validates moderator audit scope for comment vote detail retrieval.
 *
 * Test workflow:
 *
 * 1. Register member1 (who becomes community creator)
 * 2. Member1 creates a community
 * 3. Member1 creates post in the community
 * 4. Member1 adds a comment to the post (get commentId)
 * 5. Register member2
 * 6. Member2 votes on the comment (get voteId)
 * 7. Register moderator for the community using member1 email (simulated
 *    assignment)
 * 8. Moderator retrieves vote detail for commentId/voteId
 *
 *    - Validate returned record matches voterId, commentId, voteId, vote_value
 *    - Validate timestamps present
 * 9. Try unauthorized context:
 *
 *    - Register a moderator on another random community
 *    - That moderator attempts to access the vote, expect error
 * 10. Try non-existent voteId
 *
 * - Moderator requests with random voteId on same comment, expect error
 */
export async function test_api_moderator_comment_vote_detail_audit_scope(
  connection: api.IConnection,
) {
  // 1. Register member1
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "Password123!abcd",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 2. Member1 creates a community
  const communityName = RandomGenerator.alphabets(12);
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member1 creates a post
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: postTitle,
        content_body: RandomGenerator.content({ paragraphs: 2 }),
        content_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Member1 adds a comment
  const commentBody = RandomGenerator.paragraph({ sentences: 4 });
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          body: commentBody,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Register member2 (different user context)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "Password888!qwerty",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 6. Member2 votes on the comment (get voteId)
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

  // 7. Register moderator for the community (from member1 email)
  // Use same email as member1 for moderator context assignment.
  const moderatorPassword = "ModPWD#abc456!!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: member1Email,
      password: moderatorPassword as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 8. Moderator retrieves the vote detail
  const fetched =
    await api.functional.communityPlatform.moderator.comments.votes.at(
      connection,
      {
        commentId: comment.id,
        voteId: vote.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "comment id matches",
    fetched.community_platform_comment_id,
    comment.id,
  );
  TestValidator.equals("vote id matches", fetched.id, vote.id);
  TestValidator.equals(
    "voter id is correct",
    fetched.community_platform_member_id,
    member2.id,
  );
  TestValidator.equals("vote value matches", fetched.vote_value, voteValue);
  TestValidator.predicate(
    "created_at is present",
    typeof fetched.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof fetched.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    fetched.deleted_at,
    null,
  );

  // 9. Unauthorized moderator context test
  const wrongCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          slug: RandomGenerator.alphaNumeric(8),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(wrongCommunity);
  const otherModeratorEmail = typia.random<string & tags.Format<"email">>();
  const otherModeratorPassword = "SecretPass123xyz$";
  const otherModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherModeratorEmail,
      password: otherModeratorPassword as string & tags.Format<"password">,
      community_id: wrongCommunity.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(otherModerator);
  await TestValidator.error(
    "unauthorized moderator cannot fetch vote",
    async () => {
      await api.functional.communityPlatform.moderator.comments.votes.at(
        connection,
        {
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 10. Non-existent voteId returns error
  const randomVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent voteId returns error", async () => {
    await api.functional.communityPlatform.moderator.comments.votes.at(
      connection,
      {
        commentId: comment.id,
        voteId: randomVoteId,
      },
    );
  });
}
