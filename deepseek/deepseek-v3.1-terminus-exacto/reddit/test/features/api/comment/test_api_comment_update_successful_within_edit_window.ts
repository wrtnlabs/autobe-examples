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

export async function test_api_comment_update_successful_within_edit_window(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a post with a valid community name (using a common community name)
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "test",
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create a comment
  const originalComment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(originalComment);
  // Update the comment with markdown content
  const updatedContent =
    RandomGenerator.paragraph({ sentences: 3 }) + " **bold text**";
  const updatedComment =
    await api.functional.communityPlatform.user.posts.comments.update(
      userConnection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: {
          content: updatedContent,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Validate comment content is updated
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    updatedContent,
  );
  // Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    originalComment.updated_at,
    updatedComment.updated_at,
  );
  // Validate author information remains the same
  TestValidator.equals(
    "author id unchanged",
    updatedComment.author.id,
    originalComment.author.id,
  );
  TestValidator.equals(
    "author username unchanged",
    updatedComment.author.username,
    originalComment.author.username,
  );
  // Validate vote score remains unchanged
  TestValidator.equals(
    "vote score unchanged",
    updatedComment.vote_score,
    originalComment.vote_score,
  );
  // Validate replies count remains unchanged
  TestValidator.equals(
    "replies count unchanged",
    updatedComment.replies_count,
    originalComment.replies_count,
  );
  // Validate post reference remains the same
  TestValidator.equals(
    "post id unchanged",
    updatedComment.post.id,
    originalComment.post.id,
  );
  // Validate comment ID remains the same
  TestValidator.equals(
    "comment id unchanged",
    updatedComment.id,
    originalComment.id,
  );
  // Validate created_at timestamp remains the same
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalComment.created_at,
  );
}
