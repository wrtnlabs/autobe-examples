import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumSystemAudit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumSystemAudit";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_audit_reports_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin using authorize_admin_join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicForumAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Use the authenticated admin connection to access audit reports
  const auditReports: IPageIEconomicForumSystemAudit.ISummary =
    await api.functional.economicForum.admin.system.audit.reports.index(
      adminConnection,
    );
  typia.assert(auditReports);
  // Step 3: Validate pagination structure - use actual values from response
  TestValidator.equals(
    "pagination structure is correct",
    auditReports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    auditReports.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    auditReports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is correct",
    auditReports.pagination.pages ===
      Math.ceil(
        auditReports.pagination.records / auditReports.pagination.limit,
      ),
  );
  // Step 4: Validate audit records structure
  // Check at least one record if exists (optional - system may have no records)
  if (auditReports.data.length > 0) {
    // Validate that all records have correct structure and types
    for (const audit of auditReports.data) {
      typia.assert<IEconomicForumSystemAudit.ISummary>(audit);
      // Validate severity_level contains valid values as per specification
      TestValidator.predicate(
        "severity_level is valid",
        ["info", "warning", "error", "critical"].includes(audit.severity_level),
      );
    }
    // Step 5: Validate records are ordered by created_at in descending order
    // Only check if we have at least 2 records
    if (auditReports.data.length > 1) {
      for (let i = 0; i < auditReports.data.length - 1; i++) {
        const currentAudit = auditReports.data[i];
        const nextAudit = auditReports.data[i + 1];
        // Use typia.assert to ensure both are valid date-time format
        typia.assert<string & tags.Format<"date-time">>(
          currentAudit.created_at,
        );
        typia.assert<string & tags.Format<"date-time">>(nextAudit.created_at);
        // Compare timestamps
        TestValidator.predicate(
          "audit records ordered by created_at descending",
          new Date(currentAudit.created_at) >= new Date(nextAudit.created_at),
        );
      }
    }
  }
}
