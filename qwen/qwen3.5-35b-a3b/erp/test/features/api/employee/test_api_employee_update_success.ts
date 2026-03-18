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

/**
 * Test successful employee record update with all updateable fields.
 * The test authenticates as a member with employee:manage permission in an organization.
 * It creates an employee record through organization membership, then performs a PUT
 * request to update multiple fields including display_name, position, employment_type,
 * department_id, and role_id. The test validates that the response returns the updated
 * employee record with all relationships resolved (organization_member, role, department).
 */
export async function test_api_employee_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string>() satisfies string as string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string>() satisfies string as string & tags.Format<"uri">,
        referrer: typia.random<string>() satisfies string as string & tags.Format<"uri">,
      },
    },
  );
  typia.assert(authorized);
  // Step 2: Create organization membership (establishes employee record)
  const membershipConnection: api.IConnection = { host: connection.host };
  membershipConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const membership: IHrmsOrganizationMember =
    await api.functional.hrms.member.organization_members.create(
      membershipConnection,
      {
        body: {
          hrms_member_id: authorized.id,
          hrms_organization_id: typia.random<string>() satisfies string as string & tags.Format<"uuid">,
          hrms_organization_role_id:
            typia.random<string>() satisfies string as string & tags.Format<"uuid">,
        },
      },
    );
  typia.assert(membership);
  // Step 3: Capture new values for update
  const newDisplayName: string = RandomGenerator.name();
  const newPosition: string = "Senior Developer";
  const newEmploymentType: "full-time" | "part-time" | "contractor" | "intern" =
    "full-time";
  const newDepartmentId: string =
    typia.random<string>() satisfies string as string & tags.Format<"uuid">;
  const newRoleId: string = membership.organizationRole.id;
  // Step 4: Update the employee record with multiple fields
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const updatedEmployee: IHrmsEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      updateConnection,
      {
        organizationId: membership.organization.id,
        employeeId: membership.id,
        body: {
          display_name: newDisplayName,
          position: newPosition,
          employment_type: newEmploymentType,
          department_id: newDepartmentId,
          role_id: newRoleId,
        } satisfies IHrmsEmployee.IUpdate,
      },
    );
  typia.assert(updatedEmployee);
  // Step 5: Validate the update
  TestValidator.equals(
    "employee id preserved",
    updatedEmployee.id,
    membership.id,
  );
  TestValidator.equals(
    "display_name updated to new value",
    updatedEmployee.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "position updated",
    updatedEmployee.position,
    newPosition,
  );
  TestValidator.equals(
    "employment_type updated",
    updatedEmployee.employment_type,
    newEmploymentType,
  );
  TestValidator.equals(
    "department_id set",
    updatedEmployee.department?.id,
    newDepartmentId,
  );
  TestValidator.equals("role_id updated", updatedEmployee.role.id, newRoleId);
  TestValidator.equals(
    "organization preserved",
    updatedEmployee.organization_member.organization.id,
    membership.organization.id,
  );
  TestValidator.equals(
    "member preserved",
    updatedEmployee.organization_member.member.id,
    membership.member.id,
  );
  TestValidator.equals(
    "status unchanged from default",
    updatedEmployee.status,
    "active",
  );
  TestValidator.equals(
    "created_at set",
    updatedEmployee.created_at !== undefined,
    true,
  );
  TestValidator.predicate(
    "updated_at is valid",
    updatedEmployee.updated_at !== undefined,
  );
}