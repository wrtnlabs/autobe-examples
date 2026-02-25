import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_log_empty_results_valid_query(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Future date range (should return empty results)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureQuery: IDiscussionBoardAuditLog.IRequest = {
    created_at_start: tomorrow.toISOString(),
    created_at_end: new Date(
      tomorrow.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    page: 1,
    limit: 10,
  };
  const futureResult = await api.functional.discussionBoard.admin.logs.index(
    adminConnection,
    { body: futureQuery },
  );
  typia.assert(futureResult);
  // Validate empty results for future date range
  TestValidator.equals(
    "future query has zero records",
    futureResult.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "future query has zero pages",
    futureResult.pagination.pagination.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future query has empty data array",
    futureResult.data.length,
    0,
  );
  // Test 2: Non-existent action type
  const nonExistentActionQuery: IDiscussionBoardAuditLog.IRequest = {
    action_type: "non_existent_action_that_does_not_exist",
    page: 1,
    limit: 10,
  };
  const nonExistentResult =
    await api.functional.discussionBoard.admin.logs.index(adminConnection, {
      body: nonExistentActionQuery,
    });
  typia.assert(nonExistentResult);
  // Validate empty results for non-existent action type
  TestValidator.equals(
    "non-existent action has zero records",
    nonExistentResult.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent action has zero pages",
    nonExistentResult.pagination.pagination.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent action has empty data array",
    nonExistentResult.data.length,
    0,
  );
  // Test 3: Very specific search term that won't match
  const specificSearchQuery: IDiscussionBoardAuditLog.IRequest = {
    search_term: "xyz123abc789def456ghi012jkl345mno678pqr901stu234vwx567yz0",
    page: 1,
    limit: 10,
  };
  const searchResult = await api.functional.discussionBoard.admin.logs.index(
    adminConnection,
    { body: specificSearchQuery },
  );
  typia.assert(searchResult);
  // Validate empty results for specific search term
  TestValidator.equals(
    "specific search has zero records",
    searchResult.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "specific search has zero pages",
    searchResult.pagination.pagination.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "specific search has empty data array",
    searchResult.data.length,
    0,
  );
}
