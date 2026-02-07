import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_multiple_images_update(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authorize super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(admin);
  // Create a section for the article
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // Create first image attachment
  const firstImage =
    await api.functional.discussionBoard.superAdmin.articles.images.create(
      adminConnection,
      {
        articleId: (article as any).id,
        body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
      },
    );
  typia.assert(firstImage);
  // Create second image attachment for the same article
  const secondImage =
    await api.functional.discussionBoard.superAdmin.articles.images.create(
      adminConnection,
      {
        articleId: (article as any).id,
        body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
      },
    );
  typia.assert(secondImage);
  // Update first image metadata
  const updateData: IDiscussionBoardArticleImage.IUpdate = {
    display_order: 2,
  };
  const updatedImage =
    await api.functional.discussionBoard.superAdmin.articles.images.update(
      adminConnection,
      {
        articleId: (article as any).id,
        imageId: (firstImage as any).id,
        body: updateData,
      },
    );
  typia.assert(updatedImage);
  // Verify the update - using type assertions to access properties
  TestValidator.equals(
    "display order updated",
    (updatedImage as any).display_order,
    2,
  );
  // Verify second image remains different from updated image
  TestValidator.notEquals(
    "second image different",
    (updatedImage as any).id,
    (secondImage as any).id,
  );
}
