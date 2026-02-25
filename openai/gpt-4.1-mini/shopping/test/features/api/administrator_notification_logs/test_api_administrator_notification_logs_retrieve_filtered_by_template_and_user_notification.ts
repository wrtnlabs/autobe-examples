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

export async function test_api_administrator_notification_logs_retrieve_filtered_by_template_and_user_notification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(4)}@test.com`,
      password: "StrongPassword1",
    },
  });
  // Store authorization token in adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Retrieve logs without filters to get baseline data
  const noFilterResponse =
    await api.functional.shoppingMall.administrator.notificationLogs.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(noFilterResponse);
  // 3. Check if logs exist, choose one for templateId and userNotificationId filtering
  if (noFilterResponse.data.length === 0) {
    // If no logs exist, only pagination values can be tested
    TestValidator.predicate(
      "no logs available, pagination is valid",
      noFilterResponse.pagination.current === 1,
    );
    return;
  }
  // Pick existing notificationTemplateId and userNotificationId to test filtering
  // Filter for a log that has both non-null notificationTemplate and userNotification
  const validLogs = noFilterResponse.data.filter(
    (log) => log.notificationTemplate !== null && log.userNotification !== null,
  );
  if (validLogs.length === 0) {
    // No logs with both properties, test that filter works with one ID only
    const templateLog = noFilterResponse.data.find(
      (log) => log.notificationTemplate !== null,
    );
    if (templateLog) {
      const templateId = templateLog.notificationTemplate!.id;
      const filterByTemplateResponse =
        await api.functional.shoppingMall.administrator.notificationLogs.index(
          adminConnection,
          {
            body: { notificationTemplateId: templateId },
          },
        );
      typia.assert(filterByTemplateResponse);
      // All returned logs must have this templateId
      for (const log of filterByTemplateResponse.data) {
        TestValidator.equals(
          "templateId filter",
          log.notificationTemplate?.id,
          templateId,
        );
      }
    }
    const userNotificationLog = noFilterResponse.data.find(
      (log) => log.userNotification !== null,
    );
    if (userNotificationLog) {
      const userNotificationId = userNotificationLog.userNotification!.id;
      const filterByUserNotificationResponse =
        await api.functional.shoppingMall.administrator.notificationLogs.index(
          adminConnection,
          {
            body: { userNotificationId: userNotificationId },
          },
        );
      typia.assert(filterByUserNotificationResponse);
      // All returned logs must have this userNotificationId
      for (const log of filterByUserNotificationResponse.data) {
        TestValidator.equals(
          "userNotificationId filter",
          log.userNotification?.id,
          userNotificationId,
        );
      }
    }
    return;
  }
  // 4. Choose the first valid log for combined filtering
  const firstValidLog = validLogs[0];
  // 5. Test filter with both notificationTemplateId and userNotificationId
  const filterBody: IShoppingMallNotificationLog.IRequest = {
    notificationTemplateId: firstValidLog.notificationTemplate!.id,
    userNotificationId: firstValidLog.userNotification!.id,
    limit: 10,
    page: 1,
  };
  const filteredResponse =
    await api.functional.shoppingMall.administrator.notificationLogs.index(
      adminConnection,
      {
        body: filterBody,
      },
    );
  typia.assert(filteredResponse);
  // 6. Validate all returned logs match both filters
  for (const log of filteredResponse.data) {
    TestValidator.equals(
      "notificationTemplateId matches",
      log.notificationTemplate?.id,
      filterBody.notificationTemplateId,
    );
    TestValidator.equals(
      "userNotificationId matches",
      log.userNotification?.id,
      filterBody.userNotificationId,
    );
  }
  // 7. Validate pagination: current page is 1, limit is respected
  TestValidator.equals("page 1", filteredResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit respected",
    filteredResponse.data.length <= (filterBody.limit ?? 10),
  );
  // 8. Validate sorting: logs should be sorted by createdAt descending
  for (let i = 1; i < filteredResponse.data.length; i++) {
    const prev = new Date(filteredResponse.data[i - 1].createdAt).getTime();
    const curr = new Date(filteredResponse.data[i].createdAt).getTime();
    TestValidator.predicate("createdAt descending order", prev >= curr);
  }
  // 9. Authorization enforcement: test with no auth header fails
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("reject unauthorized access", async () => {
    await api.functional.shoppingMall.administrator.notificationLogs.index(
      unauthorizedConnection,
      {
        body: filterBody,
      },
    );
  });
}
