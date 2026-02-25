import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_update_by_wrong_author(
  connection: api.IConnection,
): Promise<void> {
  // Create first user (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(author);
  // Create second user (unauthorized user)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedUser = await authorize_user_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(unauthorizedUser);
  // Author creates a post
  const post = await generate_random_community_platform_user_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: RandomGenerator.alphabets(8),
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Author creates a comment
  const originalComment =
    await generate_random_community_platform_user_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(originalComment);
  // Store original comment state for comparison
  const originalContent = originalComment.content;
  const originalUpdatedAt = originalComment.updated_at;
  // Unauthorized user attempts to update the comment
  await TestValidator.httpError(
    "unauthorized comment update should return 401/403",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.user.posts.comments.update(
        unauthorizedConnection,
        {
          postId: post.id,
          commentId: originalComment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );
  // Author fetches the comment again to verify it wasn't modified
  const currentComment =
    await generate_random_community_platform_user_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: originalComment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(currentComment);
  // Validate comment was not modified by comparing with original state
  TestValidator.equals(
    "comment content should remain unchanged",
    originalComment.content,
    originalContent,
  );
  TestValidator.equals(
    "updated_at timestamp should remain unchanged",
    originalComment.updated_at,
    originalUpdatedAt,
  );
}
