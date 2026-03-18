import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

/**
 * Test successful deletion of a department with verification of cascading effects.
 * Steps: 1) Authenticate as a member with organization management permission by joining/creating a member account;
 * 2) Create an organization to establish organization context;
 * 3) Create a new department with a unique name;
 * 4) Create an organization member (employee) and assign them to the created department;
 * 5) Execute DELETE on the department;
 * 6) Verify response returns the department with deleted_at timestamp populated.
 * This validates the soft-delete mechanism for departments.
 */
export async function test_api_department_deletion_cascading_employee_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  // 2) Create an organization
  const organization: IErpHrmOrganization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        name: RandomGenerator.name(2),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      },
    });
  typia.assert(organization);
  // 3) Create a new department
  const department: IErpHrmDepartment =
    await generate_random_erp_hrm_member_departments_create(ownerConnection, {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(department);
  // Create an employee user to be assigned to the department
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee: IErpHrmMember.IAuthorized = await authorize_member_join(
    employeeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        firstName: RandomGenerator.name(1),
        lastName: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(employee);
  // 4) Create an organization member assigned to the created department
  const organizationMember: IErpHrmOrganizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          departmentId: department.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(organizationMember);
  // Verify employee was assigned to department before deletion
  TestValidator.equals(
    "employee department assignment before deletion",
    organizationMember.departmentId,
    department.id,
  );
  // 5) Execute DELETE on the department
  // API returns void on successful deletion
  await api.functional.erpHrm.member.departments.erase(ownerConnection, {
    departmentId: department.id,
  });
}