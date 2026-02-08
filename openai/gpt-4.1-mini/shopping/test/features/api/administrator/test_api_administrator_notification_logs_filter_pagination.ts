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

export async function test_api_administrator_notification_logs_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description: Test retrieval of notification logs with valid filter criteria
  // including pagination, sorting, authorization, and proper exclusions.
  // 1. Authenticate as administrator using join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare date filter range
  const now = new Date();
  const dateFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const dateTo = now.toISOString();
  // 3. Helper to validate response type and pagination metadata
  function validateResponse(
    response: IPageIShoppingMallNotificationLog.ISummary,
  ) {
    typia.assert(response);
    TestValidator.predicate(
      "pagination current page is positive",
      response.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records not negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages not negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate("data is array", Array.isArray(response.data));
  }
  // 4. Basic filter test with no filters
  {
    const body: IShoppingMallNotificationLog.IRequest = {
      event_type: null,
      notification_template_id: null,
      user_notification_id: null,
      created_at_from: null,
      created_at_to: null,
      updated_at_from: null,
      updated_at_to: null,
      page: 1,
      limit: 10,
      sort: ["+created_at"],
    };
    const output =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body },
      );
    validateResponse(output);
  }
  // 5. Filter by event_type and date range without sorting property validations due to DTO limitations
  {
    const body: IShoppingMallNotificationLog.IRequest = {
      event_type: "sent",
      notification_template_id: null,
      user_notification_id: null,
      created_at_from: dateFrom,
      created_at_to: dateTo,
      updated_at_from: null,
      updated_at_to: null,
      page: 1,
      limit: 20,
      sort: ["+created_at", "-event_type"],
    };
    const output =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body },
      );
    validateResponse(output);
  }
  // 6. Pagination metadata tests
  {
    const body: IShoppingMallNotificationLog.IRequest = {
      event_type: null,
      notification_template_id: null,
      user_notification_id: null,
      created_at_from: null,
      created_at_to: null,
      updated_at_from: null,
      updated_at_to: null,
      page: 2,
      limit: 5,
      sort: ["-created_at"],
    };
    const output =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body },
      );
    validateResponse(output);
    TestValidator.equals(
      "pagination current page",
      output.pagination.current,
      2,
    );
    TestValidator.equals("pagination limit", output.pagination.limit, 5);
    TestValidator.predicate(
      "pagination records >= data length",
      output.pagination.records >= output.data.length,
    );
    TestValidator.predicate(
      "pagination pages consistency",
      output.pagination.pages >= 0 &&
        (output.pagination.pages === 0 || output.pagination.pages >= 2),
    );
  }
  // 7. Edge case: empty results
  {
    const body: IShoppingMallNotificationLog.IRequest = {
      event_type: "nonexistent_event_type",
      notification_template_id: null,
      user_notification_id: null,
      created_at_from: null,
      created_at_to: null,
      updated_at_from: null,
      updated_at_to: null,
      page: 1,
      limit: 10,
      sort: [],
    };
    const output =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body },
      );
    validateResponse(output);
    TestValidator.equals("empty results data length", output.data.length, 0);
    TestValidator.equals(
      "empty results pagination records",
      output.pagination.records,
      0,
    );
  }
  // 8. Edge case: maximum page size
  {
    const maxLimit = 100;
    const body: IShoppingMallNotificationLog.IRequest = {
      event_type: null,
      notification_template_id: null,
      user_notification_id: null,
      created_at_from: null,
      created_at_to: null,
      updated_at_from: null,
      updated_at_to: null,
      page: 1,
      limit: maxLimit,
      sort: ["-created_at"],
    };
    const output =
      await api.functional.shoppingMall.administrator.notificationLogs.index(
        adminConnection,
        { body },
      );
    validateResponse(output);
    TestValidator.predicate(
      "max limit compliance",
      output.pagination.limit <= maxLimit,
    );
    TestValidator.predicate(
      "data length within limit",
      output.data.length <= maxLimit,
    );
  }
}
