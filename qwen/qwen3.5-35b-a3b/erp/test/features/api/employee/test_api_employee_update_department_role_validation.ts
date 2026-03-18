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
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

export async function test_api_employee_update_department_role_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin member with employee:manage permission in Organization A
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create employee member in Organization A
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employee);
  // Step 3: Create organization membership for admin in Organization A
  const orgA = typia.random<string & tags.Format<"uuid">>();
  const orgARole = typia.random<string & tags.Format<"uuid">>();
  const adminMembership =
    await generate_random_hrms_member_organization_members_create(
      adminConnection,
      {
        body: {
          hrms_member_id: admin.id,
          hrms_organization_id: orgA,
          hrms_organization_role_id: orgARole,
        },
      },
    );
  typia.assert(adminMembership);
  // Step 4: Create organization membership for employee in Organization A
  const employeeMembership =
    await generate_random_hrms_member_organization_members_create(
      employeeConnection,
      {
        body: {
          hrms_member_id: employee.id,
          hrms_organization_id: orgA,
          hrms_organization_role_id: orgARole,
        },
      },
    );
  typia.assert(employeeMembership);
  // Step 5: Get employee ID from the membership (using employeeMembership.id)
  const employeeId = employeeMembership.id;
  // Step 6: Create random department_id and role_id from Organization B (cross-org)
  const orgBDepartment = typia.random<string & tags.Format<"uuid">>();
  const orgBRole = typia.random<string & tags.Format<"uuid">>();
  // Step 7: Attempt to update employee with cross-organization department (should fail)
  await TestValidator.error(
    "should reject cross-org department assignment",
    async () => {
      await api.functional.hrms.member.organizations.employees.update(
        adminConnection,
        {
          organizationId: orgA,
          employeeId,
          body: {
            department_id: orgBDepartment,
          } satisfies IHrmsEmployee.IUpdate,
        },
      );
    },
  );
  // Step 8: Attempt to update employee with cross-organization role (should fail)
  await TestValidator.error(
    "should reject cross-org role assignment",
    async () => {
      await api.functional.hrms.member.organizations.employees.update(
        adminConnection,
        {
          organizationId: orgA,
          employeeId,
          body: {
            role_id: orgBRole,
          } satisfies IHrmsEmployee.IUpdate,
        },
      );
    },
  );
}
