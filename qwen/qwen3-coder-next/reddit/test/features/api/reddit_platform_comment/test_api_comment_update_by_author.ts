import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_posts_create } from "../../../generate/generate_random_reddit_platform_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a post
  const post = await api.functional.redditPlatform.posts.create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const createdComment =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(createdComment);
  // 4. Update the comment content
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.redditPlatform.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: createdComment.id,
        body: {
          content: newContent,
        } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate update results
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    newContent,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedComment.updated_at,
    createdComment.updated_at,
  );
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    createdComment.author.id,
  );
}
