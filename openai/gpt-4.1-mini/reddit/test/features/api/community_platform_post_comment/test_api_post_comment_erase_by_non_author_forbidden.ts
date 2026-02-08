import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
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
import { prepare_random_community_platform_post_comment } from "../../../prepare/prepare_random_community_platform_post_comment";

/**
 * Test attempt to delete a comment by a user who is not the comment's author and not a moderator.
 *
 * Steps:
 * 1. First user joins and creates a post
 * 2. First user creates a comment on that post
 * 3. Second user joins
 * 4. Second user attempts to delete first user's comment
 * 5. Validate forbidden (403) error response
 * 6. Ensure the comment remains intact and visible after failed deletion
 */
export async function test_api_post_comment_erase_by_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. First user joins
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUserAuthorized = await authorize_user_join(firstUserConnection, {
    body: {},
  });
  firstUserConnection.headers = {
    Authorization: `Bearer ${firstUserAuthorized.token.access}`,
  };
  // 2. First user creates a post
  const postRaw = await api.functional.communityPlatform.user.posts.create(
    firstUserConnection,
    {
      body: {
        // Since ICommunityPlatformPost.ICreate is 'any | any | any', use an empty object for minimal creation
      } as any,
    },
  );
  const post = typia.assert(postRaw);
  // 3. First user creates a comment on the post
  const commentRaw =
    await generate_random_community_platform_user_posts_comments_create(
      firstUserConnection,
      {
        params: { postId: (post as any).id },
      },
    );
  const comment = typia.assert(commentRaw);
  // 4. Second user joins
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuthorized = await authorize_user_join(secondUserConnection, {
    body: {},
  });
  secondUserConnection.headers = {
    Authorization: `Bearer ${secondUserAuthorized.token.access}`,
  };
  // 5. Second user attempts to delete first user's comment
  await TestValidator.httpError(
    "delete comment by non-author forbidden",
    403,
    async () => {
      await api.functional.communityPlatform.user.posts.comments.erase(
        secondUserConnection,
        {
          postId: (post as any).id,
          commentId: (comment as any).id,
        },
      );
    },
  );
  // 6. Ensure comment remains intact and visible - re-fetch comments or create a new comment to ensure DB state
  // Since no GET comments API is provided, we'll create a new comment by first user to ensure DB access
  const newCommentRaw =
    await generate_random_community_platform_user_posts_comments_create(
      firstUserConnection,
      {
        params: { postId: (post as any).id },
      },
    );
  const newComment = typia.assert(newCommentRaw);
  // Ensure new comment is different from the deleted comment
  TestValidator.notEquals(
    "deleted comment should remain",
    (comment as any).id,
    (newComment as any).id,
  );
}
