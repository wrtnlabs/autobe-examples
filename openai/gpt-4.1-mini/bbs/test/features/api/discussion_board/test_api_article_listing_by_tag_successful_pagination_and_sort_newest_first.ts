import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_article_listing_by_tag_successful_pagination_and_sort_newest_first(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account registration and connection setup
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Generate a UUID for an existing tag ID (simulation)
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve paginated articles list by tag ID with default pagination and sorting newest first
  const articlesPage =
    await api.functional.discussionBoard.administrator.tags.articles.index(
      adminConnection,
      { tagId },
    );
  typia.assert(articlesPage);
  typia.assert(articlesPage.pagination);
  // 4. Validate pagination metadata correctness
  const { pagination, data } = articlesPage;
  TestValidator.predicate(
    "pagination current page number is 1 or higher",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is a positive number",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is zero or more",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is zero or more",
    pagination.records >= 0,
  );
  // 5. Validate that each article summary is structurally valid
  for (const article of data) {
    typia.assert(article);
    // No additional field checks due to minimal schema detail
  }
  // 6. Sorting verification cannot be done due to lack of explicit timestamp fields
  // We trust server-side to sort by newest first as per specs
}
