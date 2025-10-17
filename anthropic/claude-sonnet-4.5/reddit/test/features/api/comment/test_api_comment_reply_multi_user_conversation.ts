import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test realistic multi-user conversation through nested comment replies.
 *
 * This test simulates natural community discussion flow by creating multiple
 * member accounts and having them engage in a threaded conversation at various
 * depth levels. User A creates the initial comment, User B replies to User A,
 * User C replies to User B, and User D replies to User C, creating a
 * multi-level conversation tree.
 *
 * Steps:
 *
 * 1. Register four member accounts (User A, B, C, D)
 * 2. User A creates a community
 * 3. User A creates a post in the community
 * 4. User A creates the initial top-level comment (depth 0)
 * 5. User B replies to User A's comment (depth 1)
 * 6. User C replies to User B's comment (depth 2)
 * 7. User D replies to User C's comment (depth 3)
 * 8. Validate all parent-child relationships and depth levels
 */
export async function test_api_comment_reply_multi_user_conversation(
  connection: api.IConnection,
) {
  // Step 1: Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<string & tags.MinLength<8>>();
  const userA = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: userAEmail,
      password: userAPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(userA);

  // Step 2: User A creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: User A creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 5 }),
      body: RandomGenerator.content({ paragraphs: 3 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: User A creates the initial top-level comment (depth 0)
  const commentA = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(commentA);
  TestValidator.equals("comment A depth is 0", commentA.depth, 0);
  TestValidator.equals("comment A vote score is 0", commentA.vote_score, 0);
  TestValidator.equals("comment A not edited", commentA.edited, false);

  // Step 5: Register User B and reply to User A's comment (depth 1)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<string & tags.MinLength<8>>();
  const userB = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: userBEmail,
      password: userBPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(userB);

  const replyB = await api.functional.redditLike.member.comments.replies.create(
    connection,
    {
      commentId: commentA.id,
      body: {
        content_text: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IRedditLikeComment.IReplyCreate,
    },
  );
  typia.assert(replyB);
  TestValidator.equals(
    "reply B parent is comment A",
    replyB.reddit_like_parent_comment_id,
    commentA.id,
  );
  TestValidator.equals("reply B depth is 1", replyB.depth, 1);
  TestValidator.equals("reply B vote score is 0", replyB.vote_score, 0);
  TestValidator.equals("reply B not edited", replyB.edited, false);
  TestValidator.equals(
    "reply B post reference",
    replyB.reddit_like_post_id,
    post.id,
  );

  // Step 6: Register User C and reply to User B's comment (depth 2)
  const userCEmail = typia.random<string & tags.Format<"email">>();
  const userCPassword = typia.random<string & tags.MinLength<8>>();
  const userC = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: userCEmail,
      password: userCPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(userC);

  const replyC = await api.functional.redditLike.member.comments.replies.create(
    connection,
    {
      commentId: replyB.id,
      body: {
        content_text: RandomGenerator.paragraph({ sentences: 7 }),
      } satisfies IRedditLikeComment.IReplyCreate,
    },
  );
  typia.assert(replyC);
  TestValidator.equals(
    "reply C parent is reply B",
    replyC.reddit_like_parent_comment_id,
    replyB.id,
  );
  TestValidator.equals("reply C depth is 2", replyC.depth, 2);
  TestValidator.equals("reply C vote score is 0", replyC.vote_score, 0);
  TestValidator.equals("reply C not edited", replyC.edited, false);
  TestValidator.equals(
    "reply C post reference",
    replyC.reddit_like_post_id,
    post.id,
  );

  // Step 7: Register User D and reply to User C's comment (depth 3)
  const userDEmail = typia.random<string & tags.Format<"email">>();
  const userDPassword = typia.random<string & tags.MinLength<8>>();
  const userD = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: userDEmail,
      password: userDPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(userD);

  const replyD = await api.functional.redditLike.member.comments.replies.create(
    connection,
    {
      commentId: replyC.id,
      body: {
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeComment.IReplyCreate,
    },
  );
  typia.assert(replyD);
  TestValidator.equals(
    "reply D parent is reply C",
    replyD.reddit_like_parent_comment_id,
    replyC.id,
  );
  TestValidator.equals("reply D depth is 3", replyD.depth, 3);
  TestValidator.equals("reply D vote score is 0", replyD.vote_score, 0);
  TestValidator.equals("reply D not edited", replyD.edited, false);
  TestValidator.equals(
    "reply D post reference",
    replyD.reddit_like_post_id,
    post.id,
  );
}
