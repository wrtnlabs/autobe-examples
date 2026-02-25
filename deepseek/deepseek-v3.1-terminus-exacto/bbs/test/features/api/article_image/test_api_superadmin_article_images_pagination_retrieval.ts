import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test comprehensive pagination functionality for super administrator article image retrieval.
 */
export async function test_api_superadmin_article_images_pagination_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    { body: undefined },
  );
  typia.assert(authorizedSuperAdmin);
  // 2. Create test article for image attachment
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      { body: undefined },
    );
  typia.assert(article);
  // 3. Upload multiple test images with varied metadata
  const totalImages = 5;
  const createdImages: IDiscussionBoardArticleFile[] = [];
  for (let i = 0; i < totalImages; i++) {
    const image =
      await generate_random_discussion_board_super_admin_articles_images_create(
        superAdminConnection,
        {
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: i + 1,
            alt_text: i % 2 === 0 ? `Alt text for image ${i + 1}` : null,
            caption: i % 3 === 0 ? `Caption for image ${i + 1}` : null,
          } satisfies IDiscussionBoardArticleFile.ICreate,
          params: { articleId: article.id },
        },
      );
    typia.assert(image);
    createdImages.push(image);
  }
  // 4. Test pagination retrieval with limit=2 (page size)
  const limit2 = 2;
  const page1Response =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: limit2,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata for page 1 (limit=2)
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, limit2);
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    totalImages,
  );
  TestValidator.equals(
    "page 1 total pages",
    page1Response.pagination.pages,
    Math.ceil(totalImages / limit2),
  );
  TestValidator.equals("page 1 data length", page1Response.data.length, limit2);
  // Validate image summary structure for page 1
  for (const imageSummary of page1Response.data) {
    typia.assert<IDiscussionBoardArticleFile.ISummary>(imageSummary);
    TestValidator.predicate(
      `image ${imageSummary.id} has id field`,
      typeof imageSummary.id === "string",
    );
    TestValidator.predicate(
      `image ${imageSummary.id} has status field`,
      typeof imageSummary.status === "string",
    );
    TestValidator.predicate(
      `image ${imageSummary.id} has display_order field`,
      typeof imageSummary.display_order === "number",
    );
    // alt_text can be string or null
    TestValidator.predicate(
      `image ${imageSummary.id} alt_text is string or null`,
      imageSummary.alt_text === null ||
        typeof imageSummary.alt_text === "string",
    );
    // caption can be string or null
    TestValidator.predicate(
      `image ${imageSummary.id} caption is string or null`,
      imageSummary.caption === null || typeof imageSummary.caption === "string",
    );
  }
  // 5. Test page 2 retrieval with limit=2
  const page2Response =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: limit2,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 data length", page2Response.data.length, limit2);
  // 6. Test page 3 retrieval with limit=2 (should have 1 item)
  const page3Response =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          page: 3,
          limit: limit2,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(page3Response);
  TestValidator.equals(
    "page 3 current page",
    page3Response.pagination.current,
    3,
  );
  TestValidator.equals("page 3 data length", page3Response.data.length, 1);
  // 7. Test different page size with limit=3
  const limit3 = 3;
  const page1Limit3Response =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: limit3,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(page1Limit3Response);
  TestValidator.equals(
    "limit 3 page 1 current page",
    page1Limit3Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 3 page 1 limit",
    page1Limit3Response.pagination.limit,
    limit3,
  );
  TestValidator.equals(
    "limit 3 page 1 total pages",
    page1Limit3Response.pagination.pages,
    Math.ceil(totalImages / limit3),
  );
  TestValidator.equals(
    "limit 3 page 1 data length",
    page1Limit3Response.data.length,
    limit3,
  );
  // 8. Test empty filters return all images (default page=1, limit=100)
  const emptyFilterResponse =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.equals(
    "empty filter current page",
    emptyFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty filter limit",
    emptyFilterResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "empty filter total records",
    emptyFilterResponse.pagination.records,
    totalImages,
  );
  TestValidator.equals(
    "empty filter total pages",
    emptyFilterResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "empty filter data length",
    emptyFilterResponse.data.length,
    totalImages,
  );
  // 9. Test page parameter 0 (should default to page 1)
  const pageZeroResponse =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          page: 0,
          limit: 2,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(pageZeroResponse);
  // The API should handle page=0 gracefully (likely defaulting to page 1)
  TestValidator.predicate(
    "page 0 returns valid pagination",
    pageZeroResponse.pagination.current > 0 && pageZeroResponse.data.length > 0,
  );
  // 10. Validate pagination metadata consistency across all responses
  const allResponses = [
    page1Response,
    page2Response,
    page3Response,
    page1Limit3Response,
    emptyFilterResponse,
    pageZeroResponse,
  ];
  for (const response of allResponses) {
    TestValidator.predicate(
      `pagination records consistency for limit ${response.pagination.limit}`,
      response.pagination.records === totalImages,
    );
    TestValidator.predicate(
      `pagination pages calculation for limit ${response.pagination.limit}`,
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );
    TestValidator.predicate(
      `data length <= limit for page ${response.pagination.current}`,
      response.data.length <= response.pagination.limit,
    );
  }
}
