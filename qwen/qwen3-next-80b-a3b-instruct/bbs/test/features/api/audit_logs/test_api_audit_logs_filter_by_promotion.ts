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

export async function test_api_audit_logs_filter_by_promotion(
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
  // 2. Create a regular citizen user (will be used as potential target)
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_super_administrator_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 3. Retrieve audit logs filtered by available parameters
  // Note: The IRequest does not have action_type filter, so we cannot filter server-side.
  // The scenario requires filtering by action_type='promote', but this is not possible with the API.
  // We'll retrieve logs and validate that all returned logs are promotion events (action_type='promote').
  const auditLogs =
    await api.functional.economicBoard.superAdministrator.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          actor_id: superAdmin.id,
          limit: 10,
          page: 1,
          status: "approved",
        },
      },
    );
  // 4. Validate complete response structure using typia.assert
  typia.assert<IPageIEconomicBoardAdministratorAuditLog.ISummary>(auditLogs);
  // 5. Validate each audit log entry
  auditLogs.data.forEach((log) => {
    typia.assert<IEconomicBoardAdministratorAuditLog.ISummary>(log);
    // Validate actor is IEconomicBoardAdministrator.ISummary
    typia.assert<IEconomicBoardAdministrator.ISummary>(log.actor);
    // Validate target is IEconomicBoardCitizen.ISummary or null
    if (log.target !== null && log.target !== undefined) {
      typia.assert<IEconomicBoardCitizen.ISummary>(log.target);
    }
  });
  // 6. Validate pagination metadata
  typia.assert<IPage.IPagination>(auditLogs.pagination);
  TestValidator.equals(
    "pagination current is 1",
    auditLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    auditLogs.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => auditLogs.pagination.pages >= 0,
  );
  // 7. Validate that all returned audit log entries have action_type='promote'
  // This satisfies the scenario requirement to filter by promotion events
  // Since server-side filtering is not available, we validate client-side that all results match
  const promoteLogs = auditLogs.data.filter(
    (log) => log.action_type === "promote",
  );
  TestValidator.equals(
    "all returned audit logs are promotion events",
    auditLogs.data.length,
    promoteLogs.length,
  );
  // 8. Verify that promotion events exist in the results
  TestValidator.predicate(
    "at least one promote event exists in the filtered results",
    () => promoteLogs.length > 0,
  );
  // 9. Verify that actor and target fields are populated according to specified schemas
  for (const log of promoteLogs) {
    typia.assert<IEconomicBoardAdministrator.ISummary>(log.actor);
    if (log.target !== null) {
      typia.assert<IEconomicBoardCitizen.ISummary>(log.target);
    }
  }
}
