import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_health_check_filtered_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Define the filter criteria: status 'ERROR' and a date range
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = now;
  const body: IDiscussionBoardHealthCheck.IRequest = {
    status: "ERROR",
    checkedAfter: startDate.toISOString(),
    checkedBefore: endDate.toISOString(),
    page: 1,
    limit: 10,
  };
  // 3. Call the health check index endpoint with filter
  const output =
    await api.functional.discussionBoard.administrator.healthChecks.index(
      adminConnection,
      { body },
    );
  typia.assert(output);
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is at most 10",
    output.pagination.limit <= 10,
  );
  // 5. Verify each health check item
  for (const item of output.data) {
    // Assert each item's structure
    typia.assert(item);
    TestValidator.equals("status is ERROR", item.status, "ERROR");
    // checkedAt must be within the date range
    const checkedAt = new Date(item.checkedAt);
    TestValidator.predicate(
      "checkedAt after or equal to checkedAfter",
      checkedAt >= startDate,
    );
    TestValidator.predicate(
      "checkedAt before or equal to checkedBefore",
      checkedAt <= endDate,
    );
  }
}
