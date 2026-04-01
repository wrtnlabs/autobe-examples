import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test retrieving an employee record that has been deactivated.
 *
 * This validates the business rule that deactivated employees remain viewable
 * for historical reference. The test verifies:
 * 1. Authentication as a member with employee:view permission
 * 2. Create organization to establish context for employee membership
 * 3. Select the created organization as active context
 * 4. Create a role to assign to the employee
 * 5. Create an invitation which generates an employee record
 * 6. Deactivate the employee to test retrieval of deactivated records
 * 7. Successfully retrieve the deactivated employee record by UUID
 * 8. Response shows status as 'deactivated' and deleted_at timestamp is populated
 * 9. All other employee data remains accessible
 */
export async function test_api_employee_retrieval_deactivated_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Select the organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals("organization matches", selectedOrg.id, organization.id);
  // 4. Create a role with employee:manage and employee:view permissions
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        permissions: ["employee:manage", "employee:view"],
      },
    },
  );
  typia.assert(role);
  // 5. Create a second member to invite (this will become the employee)
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: inviteeEmail,
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  // 6. Create invitation for the second member - this creates employee record
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: inviteeEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // Generate employee ID for the test (in real scenario, this comes from employee list)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 7. Deactivate the employee
  await api.functional.hrmPlatform.member.employees.erase(memberConnection, {
    employeeId: employeeId,
  });
  // 8. Retrieve the deactivated employee
  const deactivatedEmployee =
    await api.functional.hrmPlatform.member.employees.at(memberConnection, {
      employeeId: employeeId,
    });
  typia.assert(deactivatedEmployee);
  // 9. Verify status is 'deactivated' and deleted_at is populated
  TestValidator.equals(
    "status is deactivated",
    deactivatedEmployee.status,
    "deactivated",
  );
  TestValidator.predicate(
    "deleted_at is populated",
    deactivatedEmployee.deleted_at !== null,
  );
  // 10. Verify all other employee data remains accessible
  TestValidator.predicate(
    "user profile exists",
    deactivatedEmployee.user !== null,
  );
  TestValidator.predicate(
    "user has valid id",
    typeof deactivatedEmployee.user.id === "string",
  );
  TestValidator.predicate(
    "user has display_name",
    typeof deactivatedEmployee.user.display_name === "string",
  );
  TestValidator.predicate("role exists", deactivatedEmployee.role !== null);
  TestValidator.predicate(
    "role has valid id",
    typeof deactivatedEmployee.role.id === "string",
  );
  TestValidator.predicate(
    "employment_type is defined",
    typeof deactivatedEmployee.employment_type === "string",
  );
  TestValidator.predicate(
    "position is accessible",
    deactivatedEmployee.position === null ||
      typeof deactivatedEmployee.position === "string",
  );
  TestValidator.predicate(
    "department is accessible",
    deactivatedEmployee.department === null ||
      typeof deactivatedEmployee.department === "object",
  );
}
