import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_audit_logs_fetch_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // 2. Fetch audit logs with default pagination (page=1, limit=10)
  // 'status' is required by IRequest enum, so use 'pending' as neutral value
  const auditLogs =
    await api.functional.economicBoard.superAdministrator.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          limit: 10,
          page: 1,
          status: "pending" as const,
        },
      },
    );
  typia.assert(auditLogs);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", auditLogs.pagination.current, 1);
  TestValidator.equals("limit is 10", auditLogs.pagination.limit, 10);
  TestValidator.predicate(
    "records are at least 10",
    auditLogs.pagination.records >= 10,
  );
  TestValidator.predicate(
    "pages are at least 1",
    auditLogs.pagination.pages >= 1,
  );
  // 4. Validate each audit log entry
  TestValidator.predicate(
    "has at least 10 entries",
    auditLogs.data.length >= 10,
  );
  auditLogs.data.forEach((log) => {
    // Verify actor structure
    TestValidator.equals("actor has id", typeof log.actor.id, "string");
    TestValidator.equals("actor has email", typeof log.actor.email, "string");
    TestValidator.equals(
      "actor has created_at",
      typeof log.actor.created_at,
      "string",
    );
    TestValidator.equals(
      "actor is_banned is boolean",
      typeof log.actor.is_banned,
      "boolean",
    );
    // Verify target can be null or has proper structure
    if (log.target !== null && log.target !== undefined) {
      TestValidator.equals("target has id", typeof log.target.id, "string");
      TestValidator.equals(
        "target has email",
        typeof log.target.email,
        "string",
      );
      TestValidator.equals(
        "target has created_at",
        typeof log.target.created_at,
        "string",
      );
    }
    // Verify optional reason field
    if (log.reason !== null && log.reason !== undefined) {
      TestValidator.equals(
        "reason is string or null",
        typeof log.reason,
        "string",
      );
    }
  });
}
