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

export async function test_api_admin_article_images_retrieval_single(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(authResult);
  // 2. Create a section first (required before creating articles)
  const sectionId = "section-" + RandomGenerator.alphaNumeric(8);
  // 3. Create an article with a single image attachment
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 4. Create a single image attachment for the article
  const articleId = (article as any).uuid ?? (article as any).id;
  const image =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
      },
    );
  typia.assert(image);
  // 5. Retrieve all images for the article
  const result =
    await api.functional.discussionBoard.admin.articles.images.index(
      adminConnection,
      {
        articleId: articleId,
      },
    );
  typia.assert(result);
  // 6. Validate results
  TestValidator.equals("total records is 1", result.pagination.records, 1);
  TestValidator.equals("pages is 1", result.pagination.pages, 1);
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("exactly one image", result.data.length, 1);
  const imageId = (image as any).uuid ?? (image as any).id;
  TestValidator.equals("image matches created", (result.data[0] as any).uuid ?? (result.data[0] as any).id, imageId);
}