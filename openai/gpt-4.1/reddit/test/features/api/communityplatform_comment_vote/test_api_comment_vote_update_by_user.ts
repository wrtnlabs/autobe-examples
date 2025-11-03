import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test updating a comment vote by an authenticated user.
 *
 * 1. Register a new user and store the email/password for authentication context.
 * 2. Create a new community using the authenticated user.
 * 3. Create a post within the community.
 * 4. Leave a comment on the post as the user.
 * 5. Cast an initial upvote on the comment as that user.
 * 6. Update the vote by switching is_upvote to the opposite value (from true to
 *    false or vice versa).
 * 7. Assert that the vote was updated by re-checking is_upvote in the result.
 * 8. Confirm that the same user can update their vote, but (if a different user)
 *    update should fail (authorization).
 */
export async function test_api_comment_vote_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userDisplayName = RandomGenerator.name();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);
  // 2. Create a new community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);
  // 3. Create a post as the user
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_body: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Comment on the post
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 5. Cast an initial vote (upvote)
  const createVote =
    await api.functional.communityPlatform.user.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: comment.id,
          is_upvote: true,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(createVote);
  TestValidator.predicate(
    "initial vote is upvote",
    createVote.is_upvote === true,
  );
  // 6. Update the vote to downvote
  const updateVote =
    await api.functional.communityPlatform.user.commentVotes.update(
      connection,
      {
        commentVoteId: createVote.id,
        body: {
          is_upvote: false,
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updateVote);
  TestValidator.predicate(
    "updated vote is downvote",
    updateVote.is_upvote === false,
  );
  // 7. Update again back to upvote
  const updateBackVote =
    await api.functional.communityPlatform.user.commentVotes.update(
      connection,
      {
        commentVoteId: createVote.id,
        body: {
          is_upvote: true,
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updateBackVote);
  TestValidator.predicate(
    "vote can be toggled back to upvote",
    updateBackVote.is_upvote === true,
  );
  // 8. Register another user and try updating the original vote (should fail)
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherPassword = RandomGenerator.alphaNumeric(10);
  const anotherDisplayName = RandomGenerator.name();
  await api.functional.auth.user.join(connection, {
    body: {
      email: anotherEmail,
      password: anotherPassword,
      display_name: anotherDisplayName,
      href: "https://another.com/register",
      referrer: "https://site.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  await TestValidator.error(
    "other user cannot update someone else's comment vote",
    async () => {
      await api.functional.communityPlatform.user.commentVotes.update(
        connection,
        {
          commentVoteId: createVote.id,
          body: {
            is_upvote: false,
          } satisfies ICommunityPlatformCommentVote.IUpdate,
        },
      );
    },
  );
}
