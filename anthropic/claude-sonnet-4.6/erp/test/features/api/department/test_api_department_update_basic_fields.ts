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

export async function test_api_department_update_basic_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and create an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization (member becomes owner with org:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a top-level 'Engineering' department (parent)
  const engineeringDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: { name: "Engineering", description: null, parentId: null },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(engineeringDept);
  TestValidator.equals(
    "engineering dept name",
    engineeringDept.name,
    "Engineering",
  );
  // Step 4: Create a second top-level 'Backend' department (target for update)
  const backendDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: { name: "Backend", description: null, parentId: null },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(backendDept);
  TestValidator.equals("backend dept name", backendDept.name, "Backend");
  // Step 5: Update 'Backend' department — rename, add description, assign parent
  const updatedDept =
    await api.functional.erpHrm.member.organizations.departments.update(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: backendDept.id,
        body: {
          name: "Backend Team",
          description: "Responsible for all server-side development",
          parentId: engineeringDept.id,
        } satisfies IErpHrmDepartment.IUpdate,
      },
    );
  typia.assert(updatedDept);
  // Validate updated fields
  TestValidator.equals("updated name", updatedDept.name, "Backend Team");
  TestValidator.equals(
    "updated description",
    updatedDept.description,
    "Responsible for all server-side development",
  );
  TestValidator.predicate(
    "parent is set",
    updatedDept.parent !== null && updatedDept.parent !== undefined,
  );
  if (updatedDept.parent !== null && updatedDept.parent !== undefined) {
    TestValidator.equals(
      "parent id matches Engineering",
      updatedDept.parent.id,
      engineeringDept.id,
    );
    TestValidator.equals(
      "parent name matches Engineering",
      updatedDept.parent.name,
      "Engineering",
    );
  }
  TestValidator.equals(
    "children is empty array",
    updatedDept.children.length,
    0,
  );
  TestValidator.equals(
    "organization id matches",
    updatedDept.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "updated_at >= created_at",
    new Date(updatedDept.updated_at).getTime() >=
      new Date(updatedDept.created_at).getTime(),
  );
  // Step 6: Edge case — update with only name (no description, no parentId)
  const updatedDept2 =
    await api.functional.erpHrm.member.organizations.departments.update(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: backendDept.id,
        body: {
          name: "Core Backend",
        } satisfies IErpHrmDepartment.IUpdate,
      },
    );
  typia.assert(updatedDept2);
  TestValidator.equals("second update name", updatedDept2.name, "Core Backend");
  TestValidator.predicate(
    "updated_at >= created_at after second update",
    new Date(updatedDept2.updated_at).getTime() >=
      new Date(updatedDept2.created_at).getTime(),
  );
}
