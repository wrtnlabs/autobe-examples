import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test updating an employee's department assignment and position title within the organization.
 *
 * Validates the complete employee department reassignment workflow including organizational setup, department creation, employee creation through invitation, and employee update to change department and position. Ensures that the employee record correctly reflects the new department assignment and position title after the update operation.
 *
 * Special attention is given to verifying that the department_id reference is correctly updated to the target department, the position string is modified as specified, and the updated_at timestamp changes to reflect the modification time. The test confirms that partial updates work correctly by only modifying the specified fields while preserving other employee attributes.
 *
 * 1. Manager member authenticates and creates organization context.
 * 2. Creates source department for initial employee assignment.
 * 3. Creates target department for reassignment.
 * 4. Creates employee member account first.
 * 5. Creates employee invitation which returns employee record directly (email already exists).
 * 6. Updates employee to assign to target department and change position.
 * 7. Validates employee details match updated department and position, with updated_at timestamp changed.
 */
export async function test_api_employee_department_assignment_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager member authentication and organization setup
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 2. Create source department for initial employee assignment
  const sourceDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      managerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sourceDepartment);
  // 3. Create target department for reassignment
  const targetDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      managerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(targetDepartment);
  // 4. Create employee member account first (will be invited to organization)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(managerConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 5. Create employee invitation - since email already exists, returns employee record directly
  // The response type is IHrmPlatformEmployeeInvitation but API returns employee when email exists
  const invitationOrEmployee =
    await generate_random_hrm_platform_member_employee_invitations_create(
      managerConnection,
      {
        body: {
          email: employeeEmail,
          department_id: sourceDepartment.id,
          position: "Initial Position",
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitationOrEmployee);
  // Since we created the employee account above, the API returns an employee record.
  // Use unknown intermediate cast to handle the type discrepancy between function
  // signature (returns invitation) and actual API behavior (returns employee when email exists).
  const employeeId = (invitationOrEmployee as unknown as IHrmPlatformEmployee)
    .id;
  const originalUpdatedAt = invitationOrEmployee.updated_at;
  // 6. Update employee to assign to target department and change position
  const newPosition = RandomGenerator.paragraph({ sentences: 1 });
  const updatedEmployee =
    await api.functional.hrmPlatform.member.employees.update(
      managerConnection,
      {
        employeeId: employeeId,
        body: {
          department_id: targetDepartment.id,
          position: newPosition,
        } satisfies IHrmPlatformEmployee.IUpdate,
      },
    );
  typia.assert(updatedEmployee);
  // 7. Validate the update
  TestValidator.equals(
    "department matches target",
    updatedEmployee.department?.id,
    targetDepartment.id,
  );
  TestValidator.equals(
    "position matches new value",
    updatedEmployee.position,
    newPosition,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedEmployee.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "employment type preserved",
    updatedEmployee.employment_type,
    "full-time",
  );
  TestValidator.equals("employee id unchanged", updatedEmployee.id, employeeId);
}
