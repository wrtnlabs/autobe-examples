import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_super_admin_retrieve_article_images_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // 2. Generate a valid article ID for testing
  const articleId = typia.random<string>();
  // 3. Create an image attachment for the article
  const createdImage =
    await api.functional.discussionBoard.superAdmin.articles.images.create(
      superAdminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
      },
    );
  typia.assert(createdImage);
  // 4. Retrieve images for the article as super admin
  const imagesResponse =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: articleId,
      },
    );
  typia.assert(imagesResponse);
  // 5. Validate response structure
  TestValidator.equals(
    "has pagination object",
    imagesResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(imagesResponse.data),
    true,
  );
  TestValidator.predicate(
    "has at least one image",
    imagesResponse.data.length > 0,
  );
}
