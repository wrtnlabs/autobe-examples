import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_analytics_empty_state_no_data(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Test analytics endpoint with null filters (default behavior)
  const defaultAnalytics = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: null,
        event_subtype: null,
        start_date: null,
        end_date: null,
        page: null,
        limit: null,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(defaultAnalytics);
  // Validate pagination metadata for empty state
  TestValidator.equals(
    "pagination current page",
    defaultAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    defaultAnalytics.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records",
    defaultAnalytics.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages",
    defaultAnalytics.pagination.pages,
    0,
  );
  TestValidator.equals("empty data array", defaultAnalytics.data.length, 0);
  // Test with specific event type filter
  const filteredByEventType = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: "data_modification",
        event_subtype: null,
        start_date: null,
        end_date: null,
        page: null,
        limit: null,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(filteredByEventType);
  TestValidator.equals(
    "filtered records zero",
    filteredByEventType.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered data empty",
    filteredByEventType.data.length,
    0,
  );
  // Test with custom pagination parameters
  const customPagination = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: null,
        event_subtype: null,
        start_date: null,
        end_date: null,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 50 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(customPagination);
  TestValidator.equals("custom page", customPagination.pagination.current, 1);
  TestValidator.equals("custom limit", customPagination.pagination.limit, 50);
  TestValidator.equals(
    "custom records zero",
    customPagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "custom pages zero",
    customPagination.pagination.pages,
    0,
  );
  // Test with date range filter
  const currentDate = new Date().toISOString();
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const dateRangeAnalytics = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: null,
        event_subtype: null,
        start_date: currentDate satisfies string & tags.Format<"date-time">,
        end_date: futureDate satisfies string & tags.Format<"date-time">,
        page: null,
        limit: null,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(dateRangeAnalytics);
  TestValidator.equals(
    "date range records zero",
    dateRangeAnalytics.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range data empty",
    dateRangeAnalytics.data.length,
    0,
  );
  // Validate response structure consistency
  TestValidator.predicate(
    "has pagination property",
    "pagination" in defaultAnalytics,
  );
  TestValidator.predicate("has data property", "data" in defaultAnalytics);
  TestValidator.predicate(
    "data is array",
    Array.isArray(defaultAnalytics.data),
  );
}
