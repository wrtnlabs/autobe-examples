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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_department_clear_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create organization (owner auto-gets Owner role)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a department to initially assign to the member
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
      },
    );
  typia.assert(department);
  // 4. Register second member (target member to be added)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // 5. Add second member to organization with initial department assignment
  //    Owner's connection is used since only owner has employee:manage permission
  //    We need the owner's org member record to get roleId
  //    The organization's owner field contains the owner's org member summary including role
  const ownerOrgMember = organization.owner;
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondMember.id,
          roleId: ownerOrgMember.role.id,
          employmentType: "full-time",
          departmentId: department.id,
          position: "Engineer",
        },
      },
    );
  typia.assert(orgMember);
  // Capture pre-update state
  const preUpdateAt = orgMember.updated_at;
  const preId = orgMember.id;
  const preOrgId = orgMember.organization_id;
  const preRoleId = orgMember.role.id;
  // 6. Update: explicitly clear department and position, change employment_type
  const updated = await api.functional.erpHrm.member.organizationMembers.update(
    ownerConnection,
    {
      organizationMemberId: orgMember.id,
      body: {
        department_id: null,
        position: null,
        employment_type: "part-time",
      } satisfies IErpHrmOrganizationMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 7. Validate cleared fields and unchanged identity
  TestValidator.equals(
    "department should be null after clear",
    updated.department,
    null,
  );
  TestValidator.equals(
    "position should be null after clear",
    updated.position,
    null,
  );
  TestValidator.equals(
    "employment_type should be part-time",
    updated.employment_type,
    "part-time",
  );
  TestValidator.equals("status should remain active", updated.status, "active");
  TestValidator.equals(
    "role id should remain unchanged",
    updated.role.id,
    preRoleId,
  );
  TestValidator.equals("record id should remain unchanged", updated.id, preId);
  TestValidator.equals(
    "organization_id should remain unchanged",
    updated.organization_id,
    preOrgId,
  );
  TestValidator.predicate(
    "updated_at should be same or newer",
    updated.updated_at >= preUpdateAt,
  );
}
