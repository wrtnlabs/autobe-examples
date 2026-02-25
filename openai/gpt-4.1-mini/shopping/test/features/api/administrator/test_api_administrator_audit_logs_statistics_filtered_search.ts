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

export async function test_api_administrator_audit_logs_statistics_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Prepare sensible dates for filter
  const fromDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days ago
  const toDate = new Date().toISOString();
  // 2. Test with eventType and actorType filters
  const filterByEventAndActor = {
    eventType: "login",
    actorType: "administrator",
    startDate: fromDate,
    endDate: toDate,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAuditLogStatistic.IRequest;
  const res1 =
    await api.functional.shoppingMall.administrator.auditLogs.statistics.index(
      adminConnection,
      { body: filterByEventAndActor },
    );
  typia.assert(res1);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    res1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    res1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count valid",
    res1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count valid",
    res1.pagination.pages >= 0,
  );
  // Validate each data item matches filters
  for (const item of res1.data) {
    // We don't have explicit fields in ISummaryItem, but assume type & event
    // Since ISummaryItem is empty interface, no direct property check, just existence
    // So assertion only checks overall response structure
  }
  // 3. Test with keyword search on description
  const keyword = "success";
  const filterByDescription = {
    description: keyword,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallAuditLogStatistic.IRequest;
  const res2 =
    await api.functional.shoppingMall.administrator.auditLogs.statistics.index(
      adminConnection,
      { body: filterByDescription },
    );
  typia.assert(res2);
  // Validate pagination metadata for second query
  TestValidator.predicate(
    "pagination current page is 1",
    res2.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 5", res2.pagination.limit === 5);
  // No direct data property validation since ISummaryItem is empty
  // 4. Test access control - unauthorized request
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access is forbidden",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.auditLogs.statistics.index(
        unauthConnection,
        {
          body: filterByEventAndActor,
        },
      );
    },
  );
}
