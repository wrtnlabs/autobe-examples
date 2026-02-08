import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_audit_log_query_event_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // Admin authorization to get valid admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Create authorized connection with token
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = { Authorization: adminAuth.token.access };
  // Query audit logs with empty filter (pagination defaults)
  const auditLogPage =
    await api.functional.discussionBoard.audit_logs.query.index(
      authorizedConnection,
      { body: {} },
    );
  typia.assert(auditLogPage);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is >= 1",
    auditLogPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    auditLogPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    auditLogPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    auditLogPage.pagination.pages >= 0,
  );
  // Validate that data is array
  TestValidator.predicate(
    "audit log data is array",
    Array.isArray(auditLogPage.data),
  );
  // Validate each item in data is a valid summary object
  for (const logEntry of auditLogPage.data) {
    typia.assert(logEntry);
  }
}
