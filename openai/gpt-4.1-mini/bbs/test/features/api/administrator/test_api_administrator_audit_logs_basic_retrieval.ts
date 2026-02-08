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

export async function test_api_administrator_audit_logs_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Scenario 1: Basic retrieval without filters
  const auditLogsPage =
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsPage);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    auditLogsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    auditLogsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    auditLogsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    auditLogsPage.pagination.pages >= 0,
  );
  // Validate data entries array
  TestValidator.predicate(
    "data array is array",
    Array.isArray(auditLogsPage.data),
  );
  // Validate each audit log summary item
  auditLogsPage.data.forEach((logEntry) => {
    typia.assert(logEntry);
  });
  // 3. Scenario 2: Retrieval with filters - Since filter properties are unknown,we use empty filter and pagination
  const filteredAuditLogsPage =
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: {
          filter: {},
          pagination: { current: 1, limit: 10 },
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(filteredAuditLogsPage);
  // Validate pagination metadata
  TestValidator.predicate(
    "filtered pagination current page is non-negative",
    filteredAuditLogsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "filtered pagination limit is non-negative",
    filteredAuditLogsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered pagination records is non-negative",
    filteredAuditLogsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages is non-negative",
    filteredAuditLogsPage.pagination.pages >= 0,
  );
  // Validate each filtered audit log summary item
  filteredAuditLogsPage.data.forEach((logEntry) => {
    typia.assert(logEntry);
  });
  // 4. Scenario 3: Unauthorized access attempt
  // Create a connection without authorization headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to audit logs",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.auditLogs.index(
        unauthorizedConnection,
        { body: {} },
      );
    },
  );
}
