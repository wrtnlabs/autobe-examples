import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
 * Test that an authenticated member can retrieve detailed information about an active employee.
 * Validates complete employee structure including member, organization, role, and department relationships.
 */
export async function test_api_employee_view_active_employee_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Retrieve active employee details
  // Note: This test assumes an employee exists in the system or the backend simulation provides valid data
  const employee = await api.functional.hrmPlatform.member.employees.at(
    memberConnection,
    {
      employeeId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(employee);
  // 3. Validate employee structure
  TestValidator.equals("employee id is string", typeof employee.id, "string");
  TestValidator.predicate(
    "employment type is valid",
    ["full-time", "part-time", "contractor", "intern"].includes(
      employee.employment_type,
    ),
  );
  TestValidator.equals("employee status is active", employee.status, "active");
  TestValidator.equals("deleted_at is null", employee.deleted_at, null);
  // 4. Validate member relationship
  TestValidator.equals("member id exists", typeof employee.member.id, "string");
  TestValidator.equals(
    "member email is string",
    typeof employee.member.email,
    "string",
  );
  TestValidator.equals(
    "member created_at exists",
    typeof employee.member.created_at,
    "string",
  );
  // 5. Validate organization relationship
  TestValidator.equals(
    "organization id exists",
    typeof employee.organization.id,
    "string",
  );
  TestValidator.equals(
    "organization name exists",
    typeof employee.organization.name,
    "string",
  );
  // 6. Validate role relationship
  TestValidator.equals("role id exists", typeof employee.role.id, "string");
  TestValidator.equals("role name exists", typeof employee.role.name, "string");
  TestValidator.equals(
    "role is_builtin exists",
    typeof employee.role.is_builtin,
    "boolean",
  );
  // 7. Validate department relationship (optional)
  if (employee.department !== null) {
    TestValidator.equals(
      "department id exists",
      typeof employee.department.id,
      "string",
    );
    TestValidator.equals(
      "department name exists",
      typeof employee.department.name,
      "string",
    );
  }
}
