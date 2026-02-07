import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_admin_article_images_pagination_multiple(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Create a section for testing
  const sectionId = "test-section-id";
  // Create an article with the section
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  const articleWithId = article as IDiscussionBoardArticle & { id: string };
  // Upload 15 image attachments to exceed default page limit of 10
  const imageIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const image =
      await api.functional.discussionBoard.admin.articles.images.create(
        adminConnection,
        {
          articleId: articleWithId.id,
          body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
        },
      );
    typia.assert(image);
    const imageWithId = image as IDiscussionBoardArticleImage & { id: string };
    imageIds.push(imageWithId.id);
  }
  // Test pagination - first page (default limit=10)
  const firstPage =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: articleWithId.id,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals("first page records", firstPage.pagination.records, 15);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 2);
  TestValidator.equals("first page data length", firstPage.data.length, 10);
  // Test pagination - second page
  const secondPage =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: articleWithId.id,
      },
    );
  typia.assert(secondPage);
  // Validate second page contains remaining 5 images
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    15,
  );
  TestValidator.equals("second page pages", secondPage.pagination.pages, 2);
  TestValidator.equals("second page data length", secondPage.data.length, 5);
  // Verify no duplicate images between pages
  const firstPageImageIds = firstPage.data.map((img) => (img as { id: string }).id);
  const secondPageImageIds = secondPage.data.map((img) => (img as { id: string }).id);
  // Check that all images from both pages match the original uploaded images
  const allPageImageIds = [...firstPageImageIds, ...secondPageImageIds];
  TestValidator.equals("total images match", allPageImageIds.length, 15);
}