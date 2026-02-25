import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test super admin article images search with no results on empty article.
 *
 * This test verifies the image search endpoint behaves correctly when:
 * 1. An article exists but has no images attached
 * 2. Various filter combinations are applied to an empty article
 * 3. Non-existent article IDs are queried
 *
 * The test validates that pagination metadata correctly shows zero records
 * and proper error handling for invalid article IDs.
 */
export async function test_api_superadmin_article_images_no_results_empty_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a test article without any images
  // First need to handle section creation dependency - since sections are admin-managed,
  // we'll assume a valid section exists or create one via admin flow
  const article =
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Test empty article image search with default parameters
  const defaultSearch =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          page: null,
          limit: null,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // Validate empty results with proper pagination
  TestValidator.equals("data array should be empty", defaultSearch.data, []);
  TestValidator.equals(
    "should have zero records",
    defaultSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "should have zero pages",
    defaultSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    defaultSearch.pagination.limit > 0,
  );
  // 4. Test various filter combinations on empty article
  const filterTests = [
    { status: "active" },
    { display_order: 1 },
    { alt_text: "test" },
    { caption: "test caption" },
    { status: "active", display_order: 1 },
  ] as const;
  for (const filter of filterTests) {
    const filteredSearch =
      await api.functional.discussionBoard.superAdmin.articles.images.index(
        superAdminConnection,
        {
          articleId: article.id,
          body: {
            ...filter,
            page: null,
            limit: null,
          } satisfies IDiscussionBoardArticleFile.IRequest,
        },
      );
    typia.assert(filteredSearch);
    // All filtered searches should return empty results
    TestValidator.equals(
      `filter ${JSON.stringify(filter)} should have empty data`,
      filteredSearch.data,
      [],
    );
    TestValidator.equals(
      `filter ${JSON.stringify(filter)} should have zero records`,
      filteredSearch.pagination.records,
      0,
    );
    TestValidator.equals(
      `filter ${JSON.stringify(filter)} should have zero pages`,
      filteredSearch.pagination.pages,
      0,
    );
  }
  // 5. Test with non-existent article ID - handle gracefully as per scenario description
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  try {
    const invalidSearch =
      await api.functional.discussionBoard.superAdmin.articles.images.index(
        superAdminConnection,
        {
          articleId: nonExistentArticleId,
          body: {
            page: null,
            limit: null,
          } satisfies IDiscussionBoardArticleFile.IRequest,
        },
      );
    // If no error thrown, validate the response structure
    typia.assert(invalidSearch);
    TestValidator.equals(
      "non-existent article should have empty data",
      invalidSearch.data,
      [],
    );
    TestValidator.equals(
      "non-existent article should have zero records",
      invalidSearch.pagination.records,
      0,
    );
  } catch (error) {
    // If error is thrown, verify it's an HttpError with appropriate status
    TestValidator.predicate(
      "should be HttpError for non-existent article",
      error instanceof api.HttpError,
    );
    if (error instanceof api.HttpError) {
      TestValidator.predicate(
        "should be client error status",
        error.status >= 400 && error.status < 500,
      );
    }
  }
  // 6. Test pagination with explicit parameters
  const explicitPagination =
    await api.functional.discussionBoard.superAdmin.articles.images.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(explicitPagination);
  // Validate explicit pagination still shows zero results
  TestValidator.equals(
    "explicit pagination should have empty data",
    explicitPagination.data,
    [],
  );
  TestValidator.equals(
    "explicit pagination should have zero records",
    explicitPagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "explicit pagination should have zero pages",
    explicitPagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "explicit pagination current page should match",
    explicitPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit pagination limit should match",
    explicitPagination.pagination.limit,
    10,
  );
}
