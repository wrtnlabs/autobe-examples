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

export async function test_api_organization_member_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the organization owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Owner creates an organization (owner automatically assigned Owner role)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register the second member (Employee) account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeAuth);
  // Step 4: Owner adds the second member to the organization
  // Use the owner's connection since adding members requires employee:manage permission
  // The second member's platform UUID comes from employeeAuth.member.id
  // We use the owner's role ID as that's the only role UUID we know from the response
  const newOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: organization.owner.role.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(newOrgMember);
  // Validate new member setup
  TestValidator.equals(
    "new member email matches",
    newOrgMember.email,
    employeeAuth.email,
  );
  TestValidator.equals(
    "new member employment type",
    newOrgMember.employment_type,
    "full-time",
  );
  TestValidator.equals(
    "new member status is active",
    newOrgMember.status,
    "active",
  );
  // Step 5: Owner removes the second member from the organization
  await api.functional.erpHrm.member.organizationMembers.erase(
    ownerConnection,
    {
      organizationMemberId: newOrgMember.id,
    },
  );
  // Step 6: Validate that attempting to remove the already-deleted member again throws an error
  await TestValidator.error(
    "already deleted member removal should fail",
    async () => {
      await api.functional.erpHrm.member.organizationMembers.erase(
        ownerConnection,
        {
          organizationMemberId: newOrgMember.id,
        },
      );
    },
  );
}
