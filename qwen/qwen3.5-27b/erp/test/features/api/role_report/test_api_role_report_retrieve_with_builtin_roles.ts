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
 * Test that an authenticated member can retrieve the role analytics report for their organization.
 *
 * Validates the complete role report retrieval flow including member authentication and report access. Ensures that the report correctly includes role information with employee counts and permission counts. Special attention is given to verifying that the role data structure is valid and properly formatted.
 *
 * The test authenticates a new member, retrieves the role report, and validates the structure and content of the returned data.
 *
 * 1. Member registers with email and password authentication.
 * 2. Member retrieves the role analytics report for their organization.
 * 3. Validates that the report contains valid role data with proper structure.
 * 4. Verifies role has is_builtin flag set correctly.
 * 5. Confirms employee_count and permission_count are non-negative integers.
 */
export async function test_api_role_report_retrieve_with_builtin_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Retrieve role report
  const report =
    await api.functional.hrmTimeTrack.member.reports.roles.at(memberConnection);
  typia.assert(report);
  // 3. Validate role_id is a valid UUID
  TestValidator.predicate(
    "role_id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.role_id,
    ),
  );
  // 4. Validate role name exists and is non-empty
  TestValidator.predicate(
    "role has valid name",
    typeof report.name === "string" && report.name.length > 0,
  );
  // 5. Validate is_builtin is a boolean
  TestValidator.predicate(
    "role has is_builtin flag",
    typeof report.is_builtin === "boolean",
  );
  // 6. Validate employee_count is non-negative integer
  TestValidator.predicate(
    "employee_count is non-negative",
    typeof report.employee_count === "number" &&
      report.employee_count >= 0 &&
      Number.isInteger(report.employee_count),
  );
  // 7. Validate permission_count is non-negative integer
  TestValidator.predicate(
    "permission_count is non-negative",
    typeof report.permission_count === "number" &&
      report.permission_count >= 0 &&
      Number.isInteger(report.permission_count),
  );
  // 8. Validate description is string or null
  TestValidator.predicate(
    "description is string or null",
    report.description === null || typeof report.description === "string",
  );
  // 9. If built-in role, verify it has a meaningful name
  if (report.is_builtin) {
    TestValidator.predicate(
      "built-in role has descriptive name",
      report.name.length > 0,
    );
  }
}
