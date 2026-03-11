import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_post_update_text_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create a text post
  const initialTitle = RandomGenerator.name(3);
  const initialContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        type: "text" as const,
        content: initialContent,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("initial type", post.type, "text");
  // 5. Update the text post
  const updatedTitle = RandomGenerator.name(3);
  const updatedContent = RandomGenerator.content({ paragraphs: 3 });
  const updatedPost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
        content: updatedContent,
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the update results
  TestValidator.equals("updated title", updatedPost.title, updatedTitle);
  TestValidator.equals("updated content", updatedPost.content, updatedContent);
  TestValidator.equals("type preserved", updatedPost.type, "text");
  TestValidator.notEquals("title changed", updatedPost.title, post.title);
  TestValidator.notEquals("content changed", updatedPost.content, post.content);
  TestValidator.predicate(
    "updated_at changed",
    new Date(updatedPost.updated_at) > new Date(post.updated_at),
  );
  TestValidator.equals(
    "author preserved",
    updatedPost.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "community preserved",
    updatedPost.community.name,
    post.community.name,
  );
}