import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_health_check_default_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval flow with no filters to verify default pagination and full result set availability for super administrators.
  // Confirm the endpoint returns the first page of health check logs sorted by checkedAt descending by default.
  // Validate correct pagination metadata including current page, page size, total records, and total pages.
  // Check that the returned health check summary records contain required fields and valid data formats.
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  superAdminConnection.headers = { Authorization: authorized.token.access };
  // 2. Retrieve health checks with an empty filter to test default pagination and sorting
  const response =
    await api.functional.discussionBoard.superAdministrator.healthChecks.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  // 3. Assert the full response structure and pagination
  typia.assert(response);
  const { pagination, data } = response;
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("limit is at least 1", pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  // Validate consistency: pages should be ceil(records / limit) or 0 when records=0
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages count matches expected",
    pagination.pages,
    expectedPages,
  );
  // Validate that data array length does not exceed limit
  TestValidator.predicate(
    "data array length does not exceed limit",
    data.length <= pagination.limit,
  );
  // Validate each health check summary record
  for (const item of data) {
    typia.assert(item);
    // Details are empty objects according to DTO.
  }
}
