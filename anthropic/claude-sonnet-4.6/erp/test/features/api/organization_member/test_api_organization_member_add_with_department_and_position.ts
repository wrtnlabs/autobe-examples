import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_organization_member_add_with_department_and_position(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // 2. Create an organization as the owner
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role in the organization
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: "ProjectViewer",
          permissions: ["project:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // 4. Create a department in the organization
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      ownerConnection,
      {
        body: {
          name: "Engineering",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(department);
  // 5. Register a second platform user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuthorized = await authorize_member_join(
    secondUserConnection,
    {},
  );
  typia.assert(secondUserAuthorized);
  // 6. Add the second user as a member with departmentId and position
  const newMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondUserAuthorized.member.id,
          roleId: customRole.id,
          employmentType: "contractor",
          departmentId: department.id,
          position: "Senior Engineer",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(newMember);
  // 7. Validate the response fields
  TestValidator.equals(
    "employment_type is contractor",
    newMember.employment_type,
    "contractor",
  );
  TestValidator.equals("status is active", newMember.status, "active");
  TestValidator.equals(
    "position is Senior Engineer",
    newMember.position,
    "Senior Engineer",
  );
  TestValidator.equals(
    "email matches second user",
    newMember.email,
    secondUserAuthorized.member.email,
  );
  TestValidator.equals("deleted_at is null", newMember.deleted_at, null);
  // Validate department
  TestValidator.predicate(
    "department is not null",
    newMember.department !== null,
  );
  if (newMember.department !== null) {
    TestValidator.equals(
      "department id matches",
      newMember.department.id,
      department.id,
    );
    TestValidator.equals(
      "department name matches",
      newMember.department.name,
      "Engineering",
    );
    TestValidator.equals(
      "department parent is null",
      newMember.department.parent,
      null,
    );
  }
  // Validate role
  TestValidator.equals("role id matches", newMember.role.id, customRole.id);
  TestValidator.equals(
    "role name matches",
    newMember.role.name,
    customRole.name,
  );
  // 8. Negative test: Cross-org department reference should fail
  // Create a second organization with a different owner connection
  const secondOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondOwnerConnection, {});
  const secondOrganization =
    await generate_random_erp_hrm_member_organizations_create(
      secondOwnerConnection,
      {},
    );
  typia.assert(secondOrganization);
  const crossOrgDepartment =
    await generate_random_erp_hrm_member_organizations_departments_create(
      secondOwnerConnection,
      {
        body: {
          name: "CrossOrgDept",
        },
        params: {
          organizationId: secondOrganization.id,
        },
      },
    );
  typia.assert(crossOrgDepartment);
  // Register a third user to add to the first org with cross-org department
  const thirdUserConnection: api.IConnection = { host: connection.host };
  const thirdUserAuthorized = await authorize_member_join(
    thirdUserConnection,
    {},
  );
  typia.assert(thirdUserAuthorized);
  // This should fail because crossOrgDepartment belongs to secondOrganization, not organization
  await TestValidator.error(
    "cross-org department reference should fail",
    async () => {
      await generate_random_erp_hrm_member_organizations_members_create(
        ownerConnection,
        {
          body: {
            memberId: thirdUserAuthorized.member.id,
            roleId: customRole.id,
            employmentType: "full-time",
            departmentId: crossOrgDepartment.id,
            position: "Engineer",
          },
          params: {
            organizationId: organization.id,
          },
        },
      );
    },
  );
}
