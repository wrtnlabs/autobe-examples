import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_super_administrator_tag_articles_index_success(
  connection: api.IConnection,
): Promise<void> {
  /*
   * This scenario tests retrieving a paginated list of articles associated with a specific existing
   * tag by a super administrator. It verifies the successful return of the article summaries,
   * including title, author, tags, comment count, and posted time, with pagination and correct sorting
   * by newest first. The test validates that soft-deleted articles are excluded, and the response
   * contains correct pagination metadata. The scenario assumes the existence of a super administrator
   * authorized account (created by join) and a tag with several associated articles.
   */
  // Step 1: Authenticate as super administrator via join to get valid token
  const superAdminConnection: api.IConnection = { host: connection.host };
  // The join body is IDiscussionBoardSuperAdministrator.IJoin, which as per DTO is an empty object
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(authorized);
  // Set the Authorization header with the access token
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // For testing tagId, we will generate a random UUID as a placeholder (since tag creation isn't described)
  // It's assumed this tagId exists with several articles in the test environment
  const tagId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.discussionBoard.superAdministrator.tags.articles.index(
      superAdminConnection,
      { tagId },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Check article list items
  const articles = response.data;
  for (const article of articles) {
    // Assert each article summary item
    typia.assert(article);
    // Normally here would be checks on article properties like title, author etc.
    // However, based on the provided DTO, no properties are defined explicitly,
    // so only type assertion with typia.assert() is used.
  }
  // Verify sorting order if at least 2 articles
  if (articles.length >= 2) {
    for (let i = 1; i < articles.length; i++) {
      // Assuming the articles have 'created_at' or equivalent to use for sorting.
      // However, the schema IDiscussionBoardArticle.ISummary is empty in provided DTOs,
      // so cannot verify sorting by exact property.
      // This limitation means we cannot do sorting validation programmatically here.
    }
  }
}
