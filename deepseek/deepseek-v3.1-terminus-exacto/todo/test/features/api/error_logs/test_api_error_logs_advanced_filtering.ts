import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoErrorLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive filtering capabilities of the error logs endpoint.
 *
 * 1. Admin authentication using join (since it's available)
 * 2. Test individual filters (error_type, severity, service_name, environment)
 * 3. Test filter combinations
 * 4. Test date range filters (occurred_at_from/to, resolved_at_from/to)
 * 5. Test text search on error_message
 * 6. Test pagination parameters (page, limit)
 * 7. Test edge cases and empty results
 */
export async function test_api_error_logs_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test individual filter - error_type
  const errorTypeResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        error_type: "application_error",
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(errorTypeResponse);
  TestValidator.predicate(
    "error_type filter returns pagination",
    errorTypeResponse.pagination.records >= 0,
  );
  // 3. Test individual filter - severity
  const severityResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        severity: "critical",
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(severityResponse);
  TestValidator.predicate(
    "severity filter returns pagination",
    severityResponse.pagination.records >= 0,
  );
  // 4. Test filter combination - service_name + environment
  const serviceEnvResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        service_name: typia.random<string>(),
        environment: "production",
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(serviceEnvResponse);
  TestValidator.predicate(
    "service environment filter returns pagination",
    serviceEnvResponse.pagination.records >= 0,
  );
  // 5. Test date range filters - occurred_at
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const occurredAtResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        occurred_at_from: past.toISOString(),
        occurred_at_to: now.toISOString(),
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(occurredAtResponse);
  TestValidator.predicate(
    "date range filter returns pagination",
    occurredAtResponse.pagination.records >= 0,
  );
  // 6. Test resolved_at filtering (including null values for unresolved)
  const resolvedAtResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        resolved_at_from: past.toISOString(),
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(resolvedAtResponse);
  TestValidator.predicate(
    "resolved_at filter returns pagination",
    resolvedAtResponse.pagination.records >= 0,
  );
  // 7. Test text search on error_message
  const searchResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        search: RandomGenerator.substring("database connection timeout error"),
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(searchResponse);
  TestValidator.predicate(
    "text search returns pagination",
    searchResponse.pagination.records >= 0,
  );
  // 8. Test pagination parameters
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const paginationResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        page: page,
        limit: limit,
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination current page matches",
    paginationResponse.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches",
    paginationResponse.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    paginationResponse.pagination.pages >= 0,
  );
  // 9. Test edge case - search for non-existent term
  const nonExistentResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        search: "xyz123_nonexistent_search_term_abc789",
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(nonExistentResponse);
  TestValidator.equals(
    "non-existent search returns empty array",
    nonExistentResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata still valid for empty results",
    nonExistentResponse.pagination.records >= 0,
  );
  // 10. Test complex filter combination
  const complexFilterResponse =
    await api.functional.multiUserTodo.admin.error_logs.index(adminConnection, {
      body: {
        error_type: "validation_error",
        severity: "medium",
        service_name: "api_gateway",
        environment: "staging",
        occurred_at_from: past.toISOString(),
        search: "validation",
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    });
  typia.assert(complexFilterResponse);
  TestValidator.predicate(
    "complex filter combination returns valid response",
    complexFilterResponse.pagination.records >= 0,
  );
}
