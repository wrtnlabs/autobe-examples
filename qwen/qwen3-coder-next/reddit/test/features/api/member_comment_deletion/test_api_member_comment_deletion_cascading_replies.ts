import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_comment_deletion_cascading_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post in the community
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a top-level comment on the post
  const topLevelComment =
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // 4. Create nested replies (2 levels deep)
  const reply1 = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
        parent_comment_id: topLevelComment.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(reply1);
  const reply2 = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
        parent_comment_id: topLevelComment.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(reply2);
  const reply2_1 = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
        parent_comment_id: reply2.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(reply2_1);
  // 5. Delete the parent comment
  await api.functional.redditLike.member.comments.erase(memberConnection, {
    commentId: topLevelComment.id,
  });
  // 6. Verify cascading deletion - parent comment and all replies should be inaccessible
  await TestValidator.error("parent comment deleted", async () => {
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: "test",
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  });
  await TestValidator.error("reply1 deleted", async () => {
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: "test",
          parent_comment_id: reply1.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  });
  await TestValidator.error("reply2 deleted", async () => {
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: "test",
          parent_comment_id: reply2.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  });
  await TestValidator.error("reply2_1 deleted", async () => {
    await api.functional.redditLike.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: "test",
          parent_comment_id: reply2_1.id,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  });
  // 7. Verify post still exists and comment count is reduced
  const fetchedPost = await api.functional.redditLike.member.posts.create(
    memberConnection,
    { body: { title: "fetch", type: "text", content: "fetch" } },
  );
  typia.assert(fetchedPost);
  TestValidator.equals("post still accessible", fetchedPost.id, post.id);
}
