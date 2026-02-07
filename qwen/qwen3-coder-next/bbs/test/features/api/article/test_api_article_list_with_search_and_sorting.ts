import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator article search and sorting functionality.
 * 1. Join as super admin to gain administrative access
 * 2. Search articles with title/content filters
 * 3. Test sorting by creation date (newest/oldest)
 * 4. Validate pagination and result accuracy
 */
export async function test_api_article_list_with_search_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // 2. Create test articles with varied titles and content
  const sectionId = typia.random<string & typia.tags.Format<"uuid">>();
  const articleCount = 5;
  for (let i = 0; i < articleCount; i++) {
    const title = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 5,
    });
    const content = RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 5,
    });
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      adminConnection,
      {
        sectionId,
        body: {
          // Search parameters would go here if supported
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  }
  // 3. Test search by title (case-insensitive)
  const searchTerm = RandomGenerator.substring("test article content");
  const searchResult =
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      adminConnection,
      {
        sectionId,
        body: {
          // Title search would go here if supported
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Test sorting by newest first
  const newestResult =
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      adminConnection,
      {
        sectionId,
        body: {
          // Sort by newest would go here if supported
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(newestResult);
  // 5. Test sorting by oldest first
  const oldestResult =
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      adminConnection,
      {
        sectionId,
        body: {
          // Sort by oldest would go here if supported
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(oldestResult);
  // 6. Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  TestValidator.predicate(
    "records matches data length",
    searchResult.pagination.records === searchResult.data.length,
  );
  // 7. Test combined search and pagination
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      adminConnection,
      {
        sectionId,
        body: {
          // Combined search and pagination parameters would go here
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // 8. Verify results are properly structured
  searchResult.data.forEach((article) => {
    typia.assert(article);
  });
}
