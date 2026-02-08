import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_audit_logs_index_with_date_range_and_keyword_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test audit logs filtered by date range, keywords, and combined filters.
  // 1. Authenticate by joining as a new superAdministrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 2. Scenario 1: Filter audit logs by createdFrom and createdTo date range
  {
    // Define date range as ISO strings
    const createdFrom = new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 7,
    ).toISOString();
    const createdTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    // Call audit logs index with createdFrom, createdTo
    const response =
      await api.functional.discussionBoard.superAdministrator.auditLogs.index(
        adminConnection,
        {
          body: {
            createdFrom,
            createdTo,
            page: 1,
            limit: 10,
          },
        },
      );
    typia.assert(response);
    // Since IDiscussionBoardAuditLog.ISummary has no defined properties, do not assert any property of logs
    const logs = response.data.map((log) => typia.assert(log));
    // Validate pagination metadata accuracy
    const pagination = response.pagination;
    TestValidator.predicate("pagination.current >= 1", pagination.current >= 1);
    TestValidator.predicate("pagination.limit > 0", pagination.limit > 0);
    TestValidator.predicate("pagination.records >= 0", pagination.records >= 0);
    TestValidator.predicate("pagination.pages >= 0", pagination.pages >= 0);
    TestValidator.predicate(
      "pagination.pages >= Math.ceil(pagination.records / pagination.limit)",
      pagination.pages >= Math.ceil(pagination.records / pagination.limit),
    );
  }
  // 3. Scenario 2: Keyword search within audit logs
  {
    const keyword = "audit";
    const response =
      await api.functional.discussionBoard.superAdministrator.auditLogs.index(
        adminConnection,
        {
          body: {
            keyword,
            page: 1,
            limit: 10,
          },
        },
      );
    typia.assert(response);
    // Cannot assert detailed log properties since none are defined
    const logs = response.data.map((log) => typia.assert(log));
    // No way to check eventDescription content, so skipping property checks
  }
  // 4. Scenario 3: Combined filters - eventType, actorId, created date range, keyword
  {
    const createdFrom = new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 10,
    ).toISOString();
    const createdTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const eventType = "login";
    const actorId = "00000000-0000-0000-0000-000000000000";
    const keyword = "successful";
    const response =
      await api.functional.discussionBoard.superAdministrator.auditLogs.index(
        adminConnection,
        {
          body: {
            eventType,
            actorId,
            createdFrom,
            createdTo,
            keyword,
            page: 1,
            limit: 10,
          },
        },
      );
    typia.assert(response);
    // Since ISummary has no properties, skip per-log property validations
    const logs = response.data.map((log) => typia.assert(log));
    // Validate pagination metadata accuracy
    const pagination = response.pagination;
    TestValidator.predicate("pagination.current >= 1", pagination.current >= 1);
    TestValidator.predicate("pagination.limit > 0", pagination.limit > 0);
    TestValidator.predicate("pagination.records >= 0", pagination.records >= 0);
    TestValidator.predicate("pagination.pages >= 0", pagination.pages >= 0);
    TestValidator.predicate(
      "pagination.pages >= Math.ceil(pagination.records / pagination.limit)",
      pagination.pages >= Math.ceil(pagination.records / pagination.limit),
    );
  }
}
