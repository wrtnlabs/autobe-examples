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
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_update_parent_blocked_when_has_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create top-level 'Division' department (will become a parent)
  const divisionDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Division",
          description: "Top-level division department",
          parentId: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(divisionDept);
  // 4. Create 'Team A' as a child of 'Division' — this makes 'Division' a parent
  const teamADept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Team A",
          description: "Child department under Division",
          parentId: divisionDept.id,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(teamADept);
  // 5. Create another top-level 'Root' department — to be attempted as parent of 'Division'
  const rootDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Root",
          description: "Another top-level department",
          parentId: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(rootDept);
  // 6. Negative test: Attempt to assign 'Root' as parent of 'Division'
  // 'Division' has children ('Team A'), so this should fail with 422
  await TestValidator.error(
    "assigning parent to a department with active children should fail",
    async () => {
      await api.functional.erpHrm.member.organizations.departments.update(
        memberConnection,
        {
          organizationId: organization.id,
          departmentId: divisionDept.id,
          body: {
            name: "Division",
            description: "Top-level division department",
            parentId: rootDept.id,
          } satisfies IErpHrmDepartment.IUpdate,
        },
      );
    },
  );
  // 7. Positive test: Update name and description of 'Division' (keeping parentId null)
  const updatedDivision =
    await api.functional.erpHrm.member.organizations.departments.update(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: divisionDept.id,
        body: {
          name: "Engineering Division",
          description: "Main engineering group",
          parentId: null,
        } satisfies IErpHrmDepartment.IUpdate,
      },
    );
  typia.assert(updatedDivision);
  // 8. Validate the update was successful
  TestValidator.equals(
    "department name was updated",
    updatedDivision.name,
    "Engineering Division",
  );
  TestValidator.equals(
    "department description was updated",
    updatedDivision.description,
    "Main engineering group",
  );
  TestValidator.equals(
    "department parent remains null after update",
    updatedDivision.parent,
    null,
  );
}
