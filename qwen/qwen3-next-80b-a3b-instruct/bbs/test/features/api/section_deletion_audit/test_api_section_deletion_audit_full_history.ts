import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionDeletion";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionDeletion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_section_deletion_audit_full_history(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve complete audit history of section deletions
  const auditLogs =
    await api.functional.economicBoard.superAdministrator.audit.deletions.index(
      connection,
    );
  typia.assert(auditLogs);
  // Validate audit log structure
  TestValidator.equals(
    "pagination exists",
    auditLogs.pagination,
    auditLogs.pagination,
  );
  TestValidator.predicate(
    "pagination is valid",
    () => auditLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => auditLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    () => auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    () => auditLogs.pagination.pages >= 0,
  );
  TestValidator.predicate("audit logs array exists", () =>
    Array.isArray(auditLogs.data),
  );
  TestValidator.predicate("audit logs are sorted by most recent first", () => {
    if (auditLogs.data.length <= 1) return true;
    for (let i = 0; i < auditLogs.data.length - 1; i++) {
      const current = new Date(auditLogs.data[i].created_at);
      const next = new Date(auditLogs.data[i + 1].created_at);
      if (current < next) return false;
    }
    return true;
  });
  // Validate individual audit log entries
  for (const entry of auditLogs.data) {
    TestValidator.equals(
      "section_id is valid UUID",
      entry.section_id,
      entry.section_id,
    );
    TestValidator.equals(
      "administrator_id is valid UUID",
      entry.administrator_id,
      entry.administrator_id,
    );
    TestValidator.equals(
      "created_at is valid date-time",
      entry.created_at,
      entry.created_at,
    );
    typia.assert<IEconomicBoardSectionDeletion>(entry);
  }
}
