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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_detail_deactivated_still_visible(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create an organization (owner becomes the org owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register second member (target employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // 4. Add the second member to the organization as a "contractor"
  //    Use the owner's role from the organization's owner.role.id
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: organization.owner.role.id,
          employmentType: "contractor",
        },
      },
    );
  typia.assert(orgMember);
  // 5. Deactivate the second member
  const deactivated =
    await api.functional.erpHrm.member.organizationMembers.deactivate(
      ownerConnection,
      {
        organizationMemberId: orgMember.id,
      },
    );
  typia.assert(deactivated);
  // Test: Retrieve full detail of the deactivated member
  const detail = await api.functional.erpHrm.members.at(ownerConnection, {
    memberId: orgMember.id,
  });
  typia.assert(detail);
  // Assertions: verify deactivated status and preservation of employment data
  TestValidator.equals("status is deactivated", detail.status, "deactivated");
  TestValidator.equals(
    "employment_type is contractor",
    detail.employment_type,
    "contractor",
  );
  TestValidator.equals(
    "organization_id matches",
    detail.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "email matches employee email",
    detail.email,
    employeeAuth.member.email,
  );
  TestValidator.equals("deleted_at is null", detail.deleted_at, null);
}
