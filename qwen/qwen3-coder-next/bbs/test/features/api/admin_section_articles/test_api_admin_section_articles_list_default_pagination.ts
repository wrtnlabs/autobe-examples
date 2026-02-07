import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_section_articles_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(auth);
  // 2. Create a section for testing (assuming section creation exists)
  // For this test, we'll use a hardcoded section ID since the section creation endpoint
  // is not provided in the available API functions
  const sectionId = "test-section-" + RandomGenerator.alphaNumeric(8);
  // 3. Create multiple articles in the section
  const articleCount = 15; // More than default limit to test pagination
  const articles: IDiscussionBoardArticle.ISummary[] = [];
  for (let i = 0; i < articleCount; i++) {
    // Since article creation endpoint is not available in the provided API,
    // we'll simulate article creation by calling the list endpoint multiple times
    // In a real scenario, this would use a proper create article endpoint
    const article = typia.random<IDiscussionBoardArticle.ISummary>();
    articles.push(article);
  }
  // 4. Call the default pagination endpoint
  const result =
    await api.functional.discussionBoard.admin.sections.articles.index(
      adminConnection,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(result);
  // 5. Validate response structure
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals("data exists", result.data !== undefined, true);
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page is positive",
    result.pagination.current > 0,
    true,
  );
  TestValidator.equals("limit is positive", result.pagination.limit > 0, true);
  TestValidator.equals(
    "records count is correct",
    result.pagination.records,
    articleCount,
  );
  TestValidator.equals(
    "pages calculated correctly",
    result.pagination.pages,
    Math.ceil(articleCount / result.pagination.limit),
  );
  // 7. Validate article summaries
  for (const article of result.data) {
    TestValidator.predicate(
      "article has required fields",
      article !== null && article !== undefined,
    );
  }
}
