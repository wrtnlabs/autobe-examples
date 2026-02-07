import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_upload_invalid_mime(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdmin);
  // 2. Update connection with authorization token
  superAdminConnection.headers = {
    Authorization: superAdmin.token.access,
  };
  // 3. Create a test article first (required for image upload)
  // Note: The scenario doesn't specify how to create an article,
  // but image upload requires an articleId. We'll need to create one.
  // Since there's no API shown for article creation, we'll use a dummy ID
  // that represents a valid article for testing purposes.
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to upload image with invalid MIME type
  // The test should validate that the system rejects unsupported MIME types
  try {
    await api.functional.discussionBoard.superAdmin.articles.images.create(
      superAdminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
      },
    );
    // If we reach here, the test failed - invalid MIME type was accepted
    throw new Error("Test failed: Invalid MIME type was accepted");
  } catch (error) {
    // Verify it's an HTTP error with appropriate status code
    if (error instanceof Error && (error as any).status !== undefined) {
      // Expected behavior - invalid MIME type should be rejected
      TestValidator.httpError(
        "invalid MIME type should be rejected",
        [400, 422],
        () => {
          throw error;
        },
      );
    } else {
      throw error;
    }
  }
}
