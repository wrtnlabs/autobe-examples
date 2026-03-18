import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_record_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create actor-specific connection for employee API
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Generate a valid employee UUID to retrieve
  // Note: In E2E context with simulation mode, this generates mock data
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve employee record by ID
  const employee = await api.functional.hrms.member.employees.at(
    employeeConnection,
    {
      employeeId,
    },
  );
  typia.assert(employee);
  // 5. Validate employee record display fields
  TestValidator.predicate(
    "display_name is non-empty string",
    employee.display_name.length > 0,
  );
  TestValidator.predicate(
    "position can be string or null",
    employee.position === undefined ||
      employee.position === null ||
      typeof employee.position === "string",
  );
  TestValidator.predicate(
    "employment_type is non-empty string",
    employee.employment_type.length > 0,
  );
  TestValidator.predicate(
    "status is valid value (active or deactivated)",
    employee.status === "active" || employee.status === "deactivated",
  );
  // 6. Validate organization member relationship
  TestValidator.predicate(
    "organization_member exists",
    employee.organization_member !== undefined &&
      employee.organization_member !== null,
  );
  TestValidator.predicate(
    "organization_member.member exists and is object",
    typeof employee.organization_member.member === "object" &&
      employee.organization_member.member !== null,
  );
  TestValidator.predicate(
    "organization_member.organization exists and is object",
    typeof employee.organization_member.organization === "object" &&
      employee.organization_member.organization !== null,
  );
  TestValidator.predicate(
    "organization_member.organizationRole exists and is object",
    typeof employee.organization_member.organizationRole === "object" &&
      employee.organization_member.organizationRole !== null,
  );
  // 7. Validate role
  TestValidator.predicate(
    "role exists and is object",
    employee.role !== undefined && employee.role !== null,
  );
  TestValidator.predicate(
    "role.name is non-empty string",
    employee.role.name.length > 0,
  );
  TestValidator.predicate(
    "role.is_builtin is boolean",
    typeof employee.role.is_builtin === "boolean",
  );
  // 8. Validate department (optional relationship)
  TestValidator.predicate(
    "department is valid (object, null, or undefined)",
    employee.department === undefined ||
      employee.department === null ||
      (typeof employee.department === "object" && employee.department !== null),
  );
  // 9. Validate timestamps are valid date-time format
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time string",
    employee.created_at.length >= 10 && !isNaN(Date.parse(employee.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time string",
    employee.updated_at.length >= 10 && !isNaN(Date.parse(employee.updated_at)),
  );
  // 10. Validate soft-delete field (active employee should have deleted_at = null)
  TestValidator.equals(
    "deleted_at is null for active employee",
    employee.deleted_at,
    null,
  );
}
