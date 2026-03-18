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

export async function test_api_department_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (who becomes org owner with org:manage permission)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization (the member is automatically the owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a department within the organization
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: "Engineering",
        },
      },
    );
  typia.assert(department);
  // 4. Delete the department — should succeed (204 No Content, returns void)
  await api.functional.erpHrm.member.organizations.departments.erase(
    memberConnection,
    {
      organizationId: organization.id,
      departmentId: department.id,
    },
  );
  // 5. Verify irreversibility: deleting the same department again should throw an error
  await TestValidator.error(
    "second deletion should fail (department already deleted)",
    async () => {
      await api.functional.erpHrm.member.organizations.departments.erase(
        memberConnection,
        {
          organizationId: organization.id,
          departmentId: department.id,
        },
      );
    },
  );
}
