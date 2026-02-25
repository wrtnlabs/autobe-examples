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

export async function test_api_administrator_notification_logs_retrieve_no_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: `admin${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "12345678",
      },
    });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Retrieve notification logs with no filters (default pagination)
  const defaultRetrieve: IPageIShoppingMallNotificationLog.ISummary =
    await api.functional.shoppingMall.administrator.notificationLogs.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultRetrieve);
  // Validate pagination info exists and values
  TestValidator.predicate(
    "page current is >= 1",
    defaultRetrieve.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page limit is >= 1",
    defaultRetrieve.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "page records >= data length",
    defaultRetrieve.pagination.records >= defaultRetrieve.data.length,
  );
  // Validate data order is descending by createdAt
  for (let i = 1; i < defaultRetrieve.data.length; ++i) {
    const prev = defaultRetrieve.data[i - 1];
    const curr = defaultRetrieve.data[i];
    TestValidator.predicate(
      `createdAt descending order check row ${i}`,
      Date.parse(prev.createdAt) >= Date.parse(curr.createdAt),
    );
  }
  // 3. Test pagination behavior: fetch page 2 with limit 5 (if enough records)
  if (defaultRetrieve.pagination.pages >= 2) {
    const page2Limit5: IPageIShoppingMallNotificationLog.ISummary =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 5,
          },
        },
      );
    typia.assert(page2Limit5);
    // Validate pagination
    TestValidator.equals("page 2 current", page2Limit5.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2Limit5.pagination.limit, 5);
    // Validate records is unchanged or accurate
    TestValidator.predicate(
      "page 2 records >= data length",
      page2Limit5.pagination.records >= page2Limit5.data.length,
    );
    // Validate order descending
    for (let i = 1; i < page2Limit5.data.length; ++i) {
      const prev = page2Limit5.data[i - 1];
      const curr = page2Limit5.data[i];
      TestValidator.predicate(
        `page 2 createdAt descending order check row ${i}`,
        Date.parse(prev.createdAt) >= Date.parse(curr.createdAt),
      );
    }
  }
  // 4. Validate authorization prevents access without token
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access returns error", async () => {
    await api.functional.shoppingMall.administrator.notificationLogs.index(
      invalidConnection,
      { body: {} },
    );
  });
}
