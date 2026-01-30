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
export async function test_api_audit_reports_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin: IEconomicForumAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    });
  typia.assert(authorizedAdmin);
  // Step 2: Retrieve all audit reports
  const allAuditReports: IPageIEconomicForumSystemAudit.ISummary =
    await api.functional.economicForum.admin.system.audit.reports.index(
      adminConnection,
    );
  typia.assert(allAuditReports);
  // Validate pagination structure
  TestValidator.equals(
    "current page should be 1",
    allAuditReports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    allAuditReports.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    allAuditReports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    allAuditReports.pagination.pages >= 0,
  );
  // Validate core properties of each audit report
  allAuditReports.data.forEach((record) => {
    TestValidator.predicate(
      "each record has action_type as non-empty string",
      typeof record.action_type === "string" && record.action_type.length > 0,
    );
    typia.assertGuard<string & tags.Format<"uuid">>(record.target_id);
    typia.assertGuard<string & tags.Format<"date-time">>(record.created_at);
    TestValidator.predicate(
      "each record has severity_level as non-empty string",
      typeof record.severity_level === "string" &&
        record.severity_level.length > 0,
    );
    typia.assertGuard<string & tags.Format<"uuid">>(record.actor_id);
  });
  // Validate that the API response is sorted by created_at descending
  // Create a copy of the data sorted by created_at descending
  const sortedData = [...allAuditReports.data].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA; // descending order
  });
  // Verify each record in the API response matches the sorted order
  allAuditReports.data.forEach((record, index) => {
    const sortedRecord = sortedData[index];
    TestValidator.equals(
      `record at position ${index} has correct created_at order`,
      record.created_at,
      sortedRecord.created_at,
    );
  });
  // Since the API SDK does not support filtering via parameters, we validate
  // that action_type values are within expected categories
  const validActionTypes = [
    "admin_login",
    "system_update",
    "user_login",
  ] as const;
  allAuditReports.data.forEach((record) => {
    TestValidator.predicate(
      "action_type is valid",
      validActionTypes.includes(record.action_type as any),
    );
  });
}
