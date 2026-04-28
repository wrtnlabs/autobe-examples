import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a newly registered member can retrieve their own employee record with correct default values.
 *
 * Validates the employee self-retrieval workflow after member registration. When a member joins, the system creates a default organization and assigns the built-in Owner role to the employee record. The member can then retrieve their own employee details to verify proper initialization.
 *
 * Key validations include confirming the Owner role assignment with the builtIn flag, ensuring department and position remain null (no defaults), verifying active status, and confirming the member summary matches the registration data.
 *
 * 1. Member registers via join with known email, display name, and phone number.
 * 2. System creates default organization and assigns Owner role to the employee.
 * 3. Member retrieves their own employee record via self endpoint.
 * 4. Validates response is valid IHrmPlatformEmployee with correct structure.
 * 5. Validates role name is Owner with builtIn equals true.
 * 6. Validates department and position are null (no defaults assigned).
 * 7. Validates employment_type is a valid enum value and status is active.
 * 8. Validates deleted_at is null and member summary matches registration input.
 */
export async function test_api_employee_self_retrieval_after_join(
  connection: api.IConnection,
) {
  // 1. Register new member with known test data
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email,
      display_name: displayName,
    },
  });
  typia.assert(authorized);
  // 2. Retrieve own employee record using the authorized connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = joinConnection.headers;
  const employee =
    await api.functional.hrmPlatform.member.employees.me(memberConnection);
  typia.assert(employee);
  // 3. Validate role is Owner with builtIn=true
  TestValidator.equals("role name is Owner", employee.role.name, "Owner");
  TestValidator.predicate("role is built-in", employee.role.builtIn);
  // 4. Validate department is null (no default department assigned)
  TestValidator.equals("department is null", employee.department, null);
  // 5. Validate position is null (no default position assigned)
  TestValidator.equals("position is null", employee.position, null);
  // 6. Validate employment_type is a valid value within platform constraints
  const validEmploymentTypes = [
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ] as const;
  TestValidator.predicate(
    "employment_type is valid",
    validEmploymentTypes.includes(
      employee.employment_type as (typeof validEmploymentTypes)[number],
    ),
  );
  // 7. Validate status is active
  TestValidator.equals("status is active", employee.status, "active");
  // 8. Validate deleted_at is null
  TestValidator.equals("deleted_at is null", employee.deleted_at, null);
  // 9. Validate member summary matches join input
  TestValidator.equals("member email matches", employee.member.email, email);
  TestValidator.equals(
    "member display_name matches",
    employee.member.display_name,
    displayName,
  );
}