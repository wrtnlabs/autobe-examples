import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuditLogStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLogStatistic";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAuditLogStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLogStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_statistics_default_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve paginated audit log statistics with no filters and defaults
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123",
    },
  });
  // Update adminConnection headers with authorized token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Call the audit log statistics endpoint with empty request body (no filters)
  const body: IShoppingMallAuditLogStatistic.IRequest = {
    eventType: undefined,
    actorType: undefined,
    startDate: undefined,
    endDate: undefined,
    description: undefined,
    page: undefined,
    limit: undefined,
  };
  const output =
    await api.functional.shoppingMall.administrator.auditLogs.statistics.index(
      adminConnection,
      { body },
    );
  // 3. Validate entire output with typia
  typia.assert(output);
  // 4. Validate presence and types of pagination fields
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // 5. Validate output data array has summary items
  TestValidator.predicate(
    "data array is array",
    Array.isArray(output.data) && output.data.length >= 0,
  );
  // We can't deeply check ISummaryItem as it is an empty interface
  // Just ensure it is an array
  // 6. Validate access control: calling without admin authorization produces error
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("access denied without admin auth", async () => {
    await api.functional.shoppingMall.administrator.auditLogs.statistics.index(
      guestConnection,
      { body: {} },
    );
  });
}
