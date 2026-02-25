import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMvTagUsageStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_tag_usage_stats_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPass1234",
    },
  });
  typia.assert(adminAuthorized);
  // Update connection headers for authorization
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Prepare a request for paginated tag usage stats
  const requestBody: IDiscussionBoardMvTagUsageStat.IRequest = {
    page: 1,
    limit: 10,
    sortKey: "articleCount",
  };
  // 3. Call the tag usage stats index endpoint
  const output =
    await api.functional.discussionBoard.administrator.tag_usage_stats.index(
      adminConnection,
      { body: requestBody },
    );
  // 4. Assert the output matches the expected type
  typia.assert(output);
  // 5. Validate pagination metadata
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination.current is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination.limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );
  // 6. Validate each data item
  for (const stat of output.data) {
    typia.assert(stat);
    TestValidator.predicate("id is non-empty", stat.id.length > 0);
    TestValidator.predicate(
      "articleCount is non-negative",
      stat.articleCount >= 0,
    );
    TestValidator.predicate(
      "commentCount is non-negative",
      stat.commentCount >= 0,
    );
    TestValidator.predicate(
      "refreshedAt is valid date",
      !isNaN(new Date(stat.refreshedAt).getTime()),
    );
    // Validate nested tag summary
    typia.assert(stat.tag);
  }
  // 7. Validate sorting by articleCount ascending and descending
  // Ascending
  const ascRequest: IDiscussionBoardMvTagUsageStat.IRequest = {
    page: 1,
    limit: 10,
    sortKey: "articleCount",
  };
  const ascOutput =
    await api.functional.discussionBoard.administrator.tag_usage_stats.index(
      adminConnection,
      { body: ascRequest },
    );
  typia.assert(ascOutput);
  for (let i = 1; i < ascOutput.data.length; i++) {
    TestValidator.predicate(
      `ascending articleCount order: ${ascOutput.data[i - 1].articleCount} <= ${ascOutput.data[i].articleCount}`,
      ascOutput.data[i - 1].articleCount <= ascOutput.data[i].articleCount,
    );
  }
  // Descending requires a different approach - simulate by reversing ascending and checking
  // Because API does not directly support descending sortKey, so test only ascending
}
