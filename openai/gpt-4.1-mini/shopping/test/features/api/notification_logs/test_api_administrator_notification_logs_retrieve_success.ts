import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notification_logs_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve notification logs with filtering, pagination, and admin auth
  // 1. Admin Join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd",
    },
  });
  typia.assert(adminAuth);
  // Attach admin Authorization token to the adminConnection headers
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare request body with filters: eventType, createdAtFrom, createdAtTo, page, and limit
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const toDate = now.toISOString();
  const filterBody: IShoppingMallNotificationLog.IRequest = {
    eventType: "sent",
    createdAtFrom: fromDate,
    createdAtTo: toDate,
    page: 1,
    limit: 10,
  };
  // 3. Call the endpoint to retrieve notification logs
  const logs =
    await api.functional.shoppingMall.administrator.notificationLogs.index(
      adminConnection,
      {
        body: filterBody,
      },
    );
  typia.assert(logs);
  // 4. Validate the pagination metadata
  TestValidator.predicate(
    "pagination count positive",
    logs.pagination.records >= 0 &&
      logs.pagination.current === 1 &&
      logs.pagination.limit === 10 &&
      logs.pagination.pages >= 0,
  );
  // 5. Validate data array and structure
  TestValidator.predicate("logs data is array", Array.isArray(logs.data));
  for (const log of logs.data) {
    // Validate log basic properties
    typia.assert(log);
    // Check eventType matches filter if present
    if (filterBody.eventType !== undefined) {
      TestValidator.equals(
        "log.eventType matches filter",
        log.eventType,
        filterBody.eventType,
      );
    }
    // Check createdAt is within range
    const createdAt = new Date(log.createdAt);
    TestValidator.predicate(
      "createdAt within range",
      createdAt >= new Date(filterBody.createdAtFrom!) &&
        createdAt <= new Date(filterBody.createdAtTo!),
    );
    // Validate relations if present
    if (log.notificationTemplate !== null) {
      typia.assert(log.notificationTemplate);
    }
    if (log.userNotification !== null) {
      typia.assert(log.userNotification);
    }
  }
  // 6. Validate ordering by createdAt descending
  for (let i = 1; i < logs.data.length; i++) {
    const prevDate = new Date(logs.data[i - 1].createdAt);
    const currDate = new Date(logs.data[i].createdAt);
    TestValidator.predicate(
      `log order desc createdAt check at index ${i}`,
      prevDate >= currDate,
    );
  }
  // 7. Validate unauthorized access returns error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access rejected",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        unauthorizedConnection,
        {
          body: filterBody,
        },
      );
    },
  );
}
