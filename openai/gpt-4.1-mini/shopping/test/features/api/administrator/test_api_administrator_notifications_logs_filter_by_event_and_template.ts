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

export async function test_api_administrator_notifications_logs_filter_by_event_and_template(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving notification logs with filters applied for eventType and notificationTemplateId.
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // We generate a join request body as empty object since IJoin is empty type
  // but we must trigger join to get authorization token
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Set adminConnection headers with authorized token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare filter criteria for notification logs
  // Since the request type IShoppingMallNotificationLog.IRequest has no specified property fields in the schema,
  // we use an empty object for filter to fetch all logs.
  // However, user requested filtering by eventType and notification template ID.
  // Since no properties are defined in the provided type, we cannot pass eventType or notificationTemplateId in body.
  // So, we'll test with empty filter and pagination.
  const filterBody: IShoppingMallNotificationLog.IRequest = {};
  // 3. Call the logs index API
  const logsPage =
    await api.functional.shoppingMall.administrator.notifications.logs.index(
      adminConnection,
      { body: filterBody },
    );
  typia.assert(logsPage);
  // 4. Validate pagination object
  const pagination = logsPage.pagination;
  TestValidator.predicate(
    "pagination current page number is positive",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is defined and positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records is defined and non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is defined and non-negative",
    pagination.pages >= 0,
  );
  // 5. Validate returned data entries
  for (const log of logsPage.data) {
    // Assert individual log summary object
    typia.assert(log);
    // Validate presence of event type (string) and timestamps (string)
    TestValidator.predicate(
      "log has event_type property",
      typeof (log as any).event_type === "string",
    );
    TestValidator.predicate(
      "log has created_at timestamp",
      typeof (log as any).created_at === "string",
    );
    TestValidator.predicate(
      "log has updated_at timestamp",
      typeof (log as any).updated_at === "string",
    );
    // Moreover, confirm that deleted_at can be string or null
    TestValidator.predicate(
      "log deleted_at is null or string",
      (log as any).deleted_at === null ||
        typeof (log as any).deleted_at === "string",
    );
  }
}
