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
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_organization_leave_as_non_owner_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member1 (organization owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Connection, {});
  typia.assert(member1Authorized);
  // Step 2: Register member2 (non-owner member who will leave)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, {});
  typia.assert(member2Authorized);
  // Step 3: member1 creates an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      member1Connection,
      {},
    );
  typia.assert(organization);
  // Step 4: member1 creates a custom role within the organization
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    member1Connection,
    {
      body: {
        permissions: ["time:view_all"],
      },
      params: {
        organizationId: organization.id,
      },
    },
  );
  typia.assert(role);
  // Step 5: member1 adds member2 to the organization with the newly created role
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      member1Connection,
      {
        body: {
          memberId: member2Authorized.id,
          roleId: role.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // Validate member2 was added with correct details
  TestValidator.equals(
    "member2 email matches",
    orgMember.email,
    member2Authorized.email,
  );
  TestValidator.equals(
    "employment type is full-time",
    orgMember.employment_type,
    "full-time",
  );
  TestValidator.equals("member status is active", orgMember.status, "active");
  // Step 6: member2 leaves the organization
  await api.functional.erpHrm.member.organizations.members.leave(
    member2Connection,
    {
      organizationId: organization.id,
    },
  );
  // Step 7: Validate that calling leave again as member2 returns 404
  await TestValidator.httpError("double-leave returns 404", 404, async () => {
    await api.functional.erpHrm.member.organizations.members.leave(
      member2Connection,
      {
        organizationId: organization.id,
      },
    );
  });
}
