import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

export async function test_api_post_removal_spam_with_karma_reversal(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create member account who will post spam
  const spammerEmail = typia.random<string & tags.Format<"email">>();
  const spammer: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: spammerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(spammer);

  // Record initial karma before spam post
  const initialPostKarma = spammer.post_karma satisfies number as number;

  // Step 4: Member creates spam post
  const spamPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(spamPost);

  // Step 5: Create multiple voters to upvote the spam post
  const voterCount = 5;
  const voters = await ArrayUtil.asyncRepeat(voterCount, async (index) => {
    const voterEmail = typia.random<string & tags.Format<"email">>();
    const voter: IRedditLikeMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          username: RandomGenerator.alphaNumeric(10),
          email: voterEmail,
          password: typia.random<string & tags.MinLength<8>>(),
        } satisfies IRedditLikeMember.ICreate,
      });
    typia.assert(voter);
    return voter;
  });

  // Cast upvotes from all voters
  await ArrayUtil.asyncForEach(voters, async (voter) => {
    const vote: IRedditLikePostVote =
      await api.functional.redditLike.member.posts.votes.create(connection, {
        postId: spamPost.id,
        body: {
          vote_value: 1,
        } satisfies IRedditLikePostVote.ICreate,
      });
    typia.assert(vote);
  });

  // Step 6: Moderator removes post as spam
  await api.functional.redditLike.moderator.posts.remove(connection, {
    postId: spamPost.id,
    body: {
      removal_type: "spam",
      reason_category: "spam_content",
      reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IRedditLikePost.IRemove,
  });

  // Post removal completed successfully - spam removal triggers karma reversal
}
