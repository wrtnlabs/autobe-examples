import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_moderator_comment_thread_deep_nesting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for creating content
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      },
    },
  );
  // 2. Create moderator account for testing
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: IRedditLikeModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      },
    });
  // 3. Create a post in a community
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.name(3),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 4. Create a root comment
  const rootComment: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(rootComment);
  // 5. Create nested comment thread (4 levels deep)
  // Level 1: Direct reply to root
  const level1_1: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: rootComment.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(level1_1);
  const level1_2: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: rootComment.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(level1_2);
  // Level 2: Reply to level1_1
  const level2_1: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: level1_1.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(level2_1);
  const level2_2: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: level1_1.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(level2_2);
  // Level 3: Reply to level2_1
  const level3_1: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: level2_1.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(level3_1);
  // Level 4: Reply to level3_1
  const level4_1: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: level3_1.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(level4_1);
  // 6. Moderator retrieves the comment thread
  const retrievedThread: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.at(moderatorConnection, {
      commentId: rootComment.id,
    });
  typia.assert(retrievedThread);
  // 7. Validate thread structure
  TestValidator.equals(
    "thread root matches",
    retrievedThread.id,
    rootComment.id,
  );
  TestValidator.equals(
    "root content matches",
    retrievedThread.content,
    rootComment.content,
  );
  // Validate nested structure
  TestValidator.equals(
    "level 1 reply count",
    retrievedThread.replies.length,
    2,
  );
  const level1Replies = retrievedThread.replies;
  TestValidator.equals("first level 1 reply", level1Replies[0].id, level1_1.id);
  TestValidator.equals(
    "second level 1 reply",
    level1Replies[1].id,
    level1_2.id,
  );
  // Validate level 2 replies
  TestValidator.equals(
    "level 1[0] reply count",
    level1Replies[0].replies.length,
    2,
  );
  TestValidator.equals(
    "level 1[1] reply count",
    level1Replies[1].replies.length,
    0,
  );
  const level2Replies = level1Replies[0].replies;
  TestValidator.equals("first level 2 reply", level2Replies[0].id, level2_1.id);
  TestValidator.equals(
    "second level 2 reply",
    level2Replies[1].id,
    level2_2.id,
  );
  // Validate level 3 replies
  TestValidator.equals(
    "level 2[0] reply count",
    level2Replies[0].replies.length,
    1,
  );
  const level3Replies = level2Replies[0].replies;
  TestValidator.equals("first level 3 reply", level3Replies[0].id, level3_1.id);
  // Validate level 4 replies
  TestValidator.equals(
    "level 3[0] reply count",
    level3Replies[0].replies.length,
    1,
  );
  const level4Replies = level3Replies[0].replies;
  TestValidator.equals("first level 4 reply", level4Replies[0].id, level4_1.id);
  // Validate deep nesting is preserved
  TestValidator.equals(
    "deep nesting preserved",
    level4Replies[0].replies.length,
    0,
  );
}
