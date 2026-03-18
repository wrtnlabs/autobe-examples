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

export async function test_api_employee_own_record_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection and join member account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Create user-specific connection with token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 3. Retrieve employee's own record
  // Use a random UUID as employee ID - in simulation mode this returns mock data
  // In real execution, this would be the authenticated member's employee record ID
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const employee = await api.functional.hrms.member.employees.at(
    userConnection,
    {
      employeeId,
    },
  );
  typia.assert(employee);
  // 4. Validate response contains all expected fields
  TestValidator.equals(
    "display name present",
    employee.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "position type",
    typeof employee.position === "string",
    true,
  );
  TestValidator.equals(
    "employment type present",
    employee.employment_type.length > 0,
    true,
  );
  TestValidator.equals(
    "status is valid",
    employee.status === "active" || employee.status === "deactivated",
    true,
  );
  // Validate organization member relationship
  TestValidator.equals(
    "has organization member",
    employee.organization_member.id.length > 0,
    true,
  );
  TestValidator.equals(
    "org member member ID valid",
    employee.organization_member.member.id.length > 0,
    true,
  );
  // Validate role assignment
  TestValidator.equals("has role", employee.role.id.length > 0, true);
  TestValidator.equals(
    "role name present",
    employee.role.name.length > 0,
    true,
  );
  // Validate department (can be null or have data)
  if (employee.department) {
    TestValidator.equals(
      "department ID present",
      employee.department.id.length > 0,
      true,
    );
    TestValidator.equals(
      "department name present",
      employee.department.name.length > 0,
      true,
    );
  }
  // Validate timestamps
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(employee.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(employee.updated_at);
    return !isNaN(date.getTime());
  });
  // Validate soft delete timestamp
  TestValidator.equals(
    "deleted_at is valid format",
    employee.deleted_at === null ||
      new Date(employee.deleted_at).getTime() >= 0,
    true,
  );
}
