import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notification_logs_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Since IShoppingMallAdministrator.IJoin is an empty object (based on schema provided), use empty object literal
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Set authorization header
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Define invalid filter values that should yield no results
  const nonExistentEventType = "non-existent-event-type";
  const nonExistentNotificationTemplateId =
    "00000000-0000-0000-0000-000000000000"; // UUID all zeros
  const nonExistentUserNotificationId = "00000000-0000-0000-0000-000000000000";
  // 3. Date ranges that likely contain no records (far past and future)
  const farPastDate = new Date("1900-01-01T00:00:00.000Z").toISOString();
  const farFutureDate = new Date("3000-01-01T00:00:00.000Z").toISOString();
  // 4. Test filtering by non-existent event_type
  {
    const filterBody = {
      event_type: nonExistentEventType,
      notification_template_id: null,
      user_notification_id: null,
      created_at_start: null,
      created_at_end: null,
      updated_at_start: null,
      updated_at_end: null,
      page: 1,
      limit: 10,
      sort: ["created_at:desc"],
    } satisfies IShoppingMallNotificationLog.IRequest;
    const result =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body: filterBody },
      );
    typia.assert(result);
    TestValidator.equals(
      "empty result count for non-existent event_type",
      result.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty data array length for non-existent event_type",
      result.data.length,
      0,
    );
  }
  // 5. Test filtering by non-existent notification_template_id
  {
    const filterBody = {
      event_type: null,
      notification_template_id: nonExistentNotificationTemplateId,
      user_notification_id: null,
      created_at_start: null,
      created_at_end: null,
      updated_at_start: null,
      updated_at_end: null,
      page: 1,
      limit: 10,
      sort: ["created_at:desc"],
    } satisfies IShoppingMallNotificationLog.IRequest;
    const result =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body: filterBody },
      );
    typia.assert(result);
    TestValidator.equals(
      "empty result count for non-existent notification_template_id",
      result.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty data array length for non-existent notification_template_id",
      result.data.length,
      0,
    );
  }
  // 6. Test filtering by non-existent user_notification_id
  {
    const filterBody = {
      event_type: null,
      notification_template_id: null,
      user_notification_id: nonExistentUserNotificationId,
      created_at_start: null,
      created_at_end: null,
      updated_at_start: null,
      updated_at_end: null,
      page: 1,
      limit: 10,
      sort: ["created_at:desc"],
    } satisfies IShoppingMallNotificationLog.IRequest;
    const result =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body: filterBody },
      );
    typia.assert(result);
    TestValidator.equals(
      "empty result count for non-existent user_notification_id",
      result.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty data array length for non-existent user_notification_id",
      result.data.length,
      0,
    );
  }
  // 7. Test filtering by date range where there should be no records
  {
    const filterBody = {
      event_type: null,
      notification_template_id: null,
      user_notification_id: null,
      created_at_start: farPastDate,
      created_at_end: farPastDate,
      updated_at_start: farFutureDate,
      updated_at_end: farFutureDate,
      page: 1,
      limit: 10,
      sort: ["created_at:desc"],
    } satisfies IShoppingMallNotificationLog.IRequest;
    const result =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body: filterBody },
      );
    typia.assert(result);
    TestValidator.equals(
      "empty result count for out-of-bounds date range",
      result.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty data array length for out-of-bounds date range",
      result.data.length,
      0,
    );
  }
  // 8. Authorization enforcement test
  {
    const anonymousConnection: api.IConnection = { host: connection.host };
    const filterBody = {
      event_type: null,
      notification_template_id: null,
      user_notification_id: null,
      created_at_start: null,
      created_at_end: null,
      updated_at_start: null,
      updated_at_end: null,
      page: 1,
      limit: 10,
      sort: ["created_at:desc"],
    } satisfies IShoppingMallNotificationLog.IRequest;
    await TestValidator.httpError(
      "unauthorized access denied",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.notificationLogs.index(
          anonymousConnection,
          { body: filterBody },
        );
      },
    );
  }
}
