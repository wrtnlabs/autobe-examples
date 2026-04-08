import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a complete employee record by ID within the current organization context.
 *
 * Validates the complete employee retrieval flow including member authentication, employee record fetching, and response structure validation. Ensures that the employee record contains all required fields including employee ID, employment type, status, timestamps, member account information, assigned role, and optional department assignment.
 *
 * Special attention is given to verifying that all nested relations are correctly populated: the member object contains profile information, the role object contains permission count and built-in status, and the department object (when present) contains parent department reference. All timestamps are validated for proper ISO 8601 date-time format.
 *
 * 1. Member authenticates via join to obtain access token.
 * 2. Generate employee ID for retrieval (in production, this would come from employee creation).
 * 3. Call employee retrieval endpoint with the employee ID.
 * 4. Validate complete employee structure including all nested relations (member, role, department).
 * 5. Verify all required fields are present and correctly typed.
 */
export async function test_api_employee_retrieve_complete_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate employee ID for retrieval
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve employee record
  const employee = await api.functional.hrmPlatform.member.employees.at(
    memberConnection,
    {
      employeeId: employeeId,
    },
  );
  typia.assert(employee);
  // 4. Validate employee ID matches request
  TestValidator.equals("employee id", employee.id, employeeId);
  // 5. Validate deleted_at is null for active record
  TestValidator.equals("deleted_at is null", employee.deleted_at, null);
  // 6. Validate member relation matches authenticated user
  TestValidator.equals("member id", employee.member.id, memberAuth.id);
  TestValidator.equals("member email", employee.member.email, memberAuth.email);
  // 7. Validate member profile structure if exists
  if (employee.member.profile !== null) {
    TestValidator.equals(
      "profile member id",
      employee.member.profile.member.id,
      employee.member.id,
    );
  }
  // 8. Validate role is assigned
  TestValidator.predicate("role has id", employee.role.id.length > 0);
  TestValidator.predicate("role has name", employee.role.name.length > 0);
  // 9. Validate department structure if assigned
  if (employee.department !== null && employee.department !== undefined) {
    TestValidator.predicate(
      "department has id",
      employee.department.id.length > 0,
    );
    TestValidator.predicate(
      "department has name",
      employee.department.name.length > 0,
    );
  }
  // 10. Validate position field handling (optional field)
  TestValidator.predicate(
    "position is null, undefined, or string",
    employee.position === null ||
      employee.position === undefined ||
      typeof employee.position === "string",
  );
}
