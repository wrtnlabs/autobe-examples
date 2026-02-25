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

export async function test_api_analytics_comprehensive_usage_stats(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create audit log entries with different properties
  const eventTypes = [
    "authentication",
    "data_modification",
    "system_configuration",
  ] as const;
  const eventSubtypes = [
    "login_success",
    "create_todo",
    "update_todo",
    null,
  ] as const;
  // Generate test audit logs with variety of data
  await ArrayUtil.asyncRepeat(15, async (index) => {
    const eventType = RandomGenerator.pick(eventTypes);
    const eventSubtype = RandomGenerator.pick(eventSubtypes);
    // Simulate creating audit log entry (actual audit logs would be created by system operations)
    // For this test, we'll create audit entries by performing actual operations
    if (eventType === "authentication" && eventSubtype === "login_success") {
      // This would typically be created by the login process
      // For test purposes, we simulate by creating another user join/logout pattern
      const tempConnection: api.IConnection = { host: connection.host };
      await authorize_user_join(tempConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          href: "https://example.com/todo-app",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.IJoin,
      });
    }
  });
  // Test 1: Analytics with no filters (all data)
  const analytics1 = await api.functional.todoApp.user.analytics(
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
  typia.assert(analytics1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof analytics1.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    analytics1.pagination.current > 0,
  );
  TestValidator.predicate("has limit", analytics1.pagination.limit > 0);
  TestValidator.predicate(
    "has records count",
    analytics1.pagination.records >= 0,
  );
  TestValidator.predicate("has pages count", analytics1.pagination.pages >= 0);
  // Test 2: Analytics with date range filter
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const analytics2 = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: null,
        event_subtype: null,
        start_date: yesterday,
        end_date: tomorrow,
        page: null,
        limit: null,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(analytics2);
  // Test 3: Analytics with event type filter
  const analytics3 = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: "authentication",
        event_subtype: null,
        start_date: null,
        end_date: null,
        page: null,
        limit: null,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(analytics3);
  // Test 4: Analytics with pagination
  const analytics4 = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: null,
        event_subtype: null,
        start_date: null,
        end_date: null,
        page: 1,
        limit: 5,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(analytics4);
  // Validate pagination parameters
  TestValidator.equals("page 1 requested", analytics4.pagination.current, 1);
  TestValidator.equals("limit 5 requested", analytics4.pagination.limit, 5);
  // Test 5: Analytics with event type and subtype filter
  const analytics5 = await api.functional.todoApp.user.analytics(
    userConnection,
    {
      body: {
        event_type: "authentication",
        event_subtype: "login_success",
        start_date: null,
        end_date: null,
        page: null,
        limit: null,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(analytics5);
  // Validate that all responses are arrays of audit logs
  TestValidator.predicate(
    "analytics1 has data array",
    Array.isArray(analytics1.data),
  );
  TestValidator.predicate(
    "analytics2 has data array",
    Array.isArray(analytics2.data),
  );
  TestValidator.predicate(
    "analytics3 has data array",
    Array.isArray(analytics3.data),
  );
  TestValidator.predicate(
    "analytics4 has data array",
    Array.isArray(analytics4.data),
  );
  TestValidator.predicate(
    "analytics5 has data array",
    Array.isArray(analytics5.data),
  );
  // Validate audit log structure for one entry (if available)
  if (analytics1.data.length > 0) {
    const sampleLog = analytics1.data[0];
    TestValidator.predicate("has id field", typeof sampleLog.id === "string");
    TestValidator.predicate(
      "has event_type field",
      typeof sampleLog.event_type === "string",
    );
    TestValidator.predicate(
      "has severity field",
      typeof sampleLog.severity === "string",
    );
    TestValidator.predicate(
      "has description field",
      typeof sampleLog.description === "string",
    );
    TestValidator.predicate(
      "has created_at field",
      typeof sampleLog.created_at === "string",
    );
    TestValidator.predicate(
      "has updated_at field",
      typeof sampleLog.updated_at === "string",
    );
  }
}
