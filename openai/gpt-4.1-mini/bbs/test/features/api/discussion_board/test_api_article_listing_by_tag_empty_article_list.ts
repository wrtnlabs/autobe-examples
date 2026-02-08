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

export async function test_api_article_listing_by_tag_empty_article_list(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join to authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Generate a random UUID for a tag that does not have any linked articles
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // Fetch articles by tag Id
  const output =
    await api.functional.discussionBoard.administrator.tags.articles.index(
      adminConnection,
      { tagId },
    );
  typia.assert(output);
  // Validate that the data array is empty indicating no articles
  TestValidator.equals("articles list should be empty", output.data.length, 0);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination records should be zero",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero",
    output.pagination.pages,
    0,
  );
  // current page and limit should at least be non-negative numbers
  TestValidator.predicate(
    "pagination current page non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    output.pagination.limit >= 0,
  );
}
