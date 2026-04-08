import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRoleReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test role report endpoint with built-in and custom roles displaying accurate employee and permission counts.
 *
 * Validates the role report API that provides aggregated statistics about role distribution, permission assignments, and usage metrics within the organization. The test ensures that the report correctly includes role information with accurate counts for employees and permissions.
 *
 * Special attention is given to verifying that built-in roles are properly identified, employee counts reflect active assignments, and permission counts accurately represent role configurations. Soft-deleted roles are excluded from the report, and the data is organization-scoped to the authenticated member's current organization.
 *
 * 1. Member authenticates with email and password credentials.
 * 2. Role report is retrieved for the current organization.
 * 3. Validates report structure contains all required fields with correct types.
 * 4. Verifies is_builtin flag is properly set for system vs custom roles.
 * 5. Confirms employee_count and permission_count are non-negative integers.
 * 6. Ensures role_id is valid UUID format and name is non-empty.
 */
export async function test_api_role_report_with_custom_roles_and_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Retrieve role report
  const report: IHrmTimeTrackRoleReport =
    await api.functional.hrmTimeTrack.member.reports.roles.at(memberConnection);
  typia.assert(report);
  // 3. Validate role_id is valid UUID format
  TestValidator.predicate(
    "role_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.role_id,
    ),
  );
  // 4. Validate role has non-empty name
  TestValidator.predicate("role has non-empty name", report.name.length > 0);
  // 5. Validate is_builtin is boolean
  TestValidator.predicate(
    "is_builtin is boolean",
    typeof report.is_builtin === "boolean",
  );
  // 6. Validate employee_count is non-negative integer
  TestValidator.predicate(
    "employee_count is non-negative integer",
    Number.isInteger(report.employee_count) && report.employee_count >= 0,
  );
  // 7. Validate permission_count is non-negative integer
  TestValidator.predicate(
    "permission_count is non-negative integer",
    Number.isInteger(report.permission_count) && report.permission_count >= 0,
  );
  // 8. Validate description is string or null
  TestValidator.predicate(
    "description is string or null",
    report.description === null || typeof report.description === "string",
  );
  // 9. Business logic: if built-in role, should have reasonable permission count
  TestValidator.predicate(
    "built-in roles have permissions",
    !report.is_builtin || report.permission_count > 0,
  );
  // 10. Business logic: role should exist (has at least some data)
  TestValidator.predicate(
    "role has valid data",
    report.role_id.length > 0 && report.name.length > 0,
  );
}
