import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test audit log retrieval for security incident investigation scenarios.
 * Authenticate as admin, then test various filtering capabilities including
 * date ranges, success status, event types, and actor types to simulate
 * security investigation workflows.
 */
export async function test_api_admin_audit_logs_security_incident_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Test basic audit log retrieval with default parameters
  const basicResponse =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(basicResponse);
  TestValidator.predicate(
    "has pagination structure",
    () => basicResponse.pagination !== undefined,
  );
  TestValidator.predicate("has data array", () =>
    Array.isArray(basicResponse.data),
  );
  // 3. Test filtering by date range (simulating investigation of recent incidents)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const dateFilterResponse =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        created_at_start: twoDaysAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
        created_at_end: oneDayAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(dateFilterResponse);
  // 4. Test filtering by success flag (investigate failed attempts)
  const failedAttemptsResponse =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        success_flag: false,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(failedAttemptsResponse);
  // Verify all returned logs have success_flag = false
  if (failedAttemptsResponse.data.length > 0) {
    TestValidator.predicate(
      "all failed attempts have success_flag false",
      failedAttemptsResponse.data.every((log) => log.success_flag === false),
    );
  }
  // 5. Test filtering by event type (simulate looking for specific security events)
  const eventTypeResponse =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        event_type: "user_login",
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(eventTypeResponse);
  // 6. Test filtering by actor type (investigate member vs admin activities)
  const actorTypeResponse =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        actor_type: "member",
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(actorTypeResponse);
  // 7. Test combined filters (complex investigation scenario)
  const combinedResponse =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        success_flag: false,
        event_type: "user_login",
        actor_type: "member",
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(combinedResponse);
  // 8. Test pagination bounds
  TestValidator.predicate(
    "pagination current page valid",
    basicResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit within bounds",
    basicResponse.pagination.limit >= 1 &&
      basicResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    basicResponse.pagination.pages >= 0,
  );
  // 9. Verify audit log summary structure for a sample entry (if available)
  if (basicResponse.data.length > 0) {
    const sampleLog = basicResponse.data[0];
    TestValidator.predicate("has id", () => typeof sampleLog.id === "string");
    TestValidator.predicate(
      "has actor_type",
      () => typeof sampleLog.actor_type === "string",
    );
    TestValidator.predicate(
      "has event_type",
      () => typeof sampleLog.event_type === "string",
    );
    TestValidator.predicate(
      "has success_flag",
      () => typeof sampleLog.success_flag === "boolean",
    );
    TestValidator.predicate(
      "has created_at",
      () => typeof sampleLog.created_at === "string",
    );
  }
}
