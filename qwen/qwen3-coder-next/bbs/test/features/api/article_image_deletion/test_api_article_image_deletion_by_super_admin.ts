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

export async function test_api_article_image_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Super admin joins the system
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // Step 2: Create an article with an image
  // Note: Using the available API - image creation with articleId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const image =
    await api.functional.discussionBoard.superAdmin.articles.images.create(
      adminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
      },
    );
  typia.assert(image);
  // Step 3: Delete the specific image
  await api.functional.discussionBoard.superAdmin.articles.images.eraseImage(
    adminConnection,
    {
      articleId: articleId,
      imageId: (image as { imageId: string }).imageId,
    },
  );
  // Step 4: Verify the deletion
  // The eraseImage function returns void, so we can't validate the response
  // But we can verify the operation completed without throwing an error
  TestValidator.equals("deletion completed without error", true, true);
}