import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
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
import { generate_random_erp_hrm_member_organization_members_contracts_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_contracts_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_employee_contract } from "../../../prepare/prepare_random_erp_hrm_employee_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_employee_contract_creation_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member (Owner) - ownerConnection gets auth token set automatically
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create organization - first member becomes owner with full permissions
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register second member (target employee) - we only need their platform member ID
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuthorized = await authorize_member_join(
    targetMemberConnection,
    {},
  );
  typia.assert(targetMemberAuthorized);
  // Step 4: Owner adds second member to the organization
  // Use ownerConnection (has employee:manage permission) to add members
  const targetOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: targetMemberAuthorized.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(targetOrgMember);
  // Step 5: Register third member (unauthorized actor)
  // Create the connection FIRST so authorize_member_join sets auth token on it
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedMemberAuthorized = await authorize_member_join(
    unauthorizedConnection,
    {},
  );
  typia.assert(unauthorizedMemberAuthorized);
  // Step 6: Owner adds third member to organization with Employee role (no employee:manage)
  const unauthorizedOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: unauthorizedMemberAuthorized.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(unauthorizedOrgMember);
  // Step 7: Attempt to create a contract as the unauthorized member (Employee role)
  // The unauthorizedConnection already has the third member's auth token from Step 5
  // This should be rejected with 403 Forbidden because Employee role lacks employee:manage
  await TestValidator.httpError(
    "employee without employee:manage permission cannot create contract",
    403,
    async () => {
      await generate_random_erp_hrm_member_organization_members_contracts_create(
        unauthorizedConnection,
        {
          params: {
            organizationMemberId: targetOrgMember.id,
          },
          body: {
            payRate: 4000,
            payPeriod: "monthly",
            workingHoursPerWeek: 40,
            startDate: new Date().toISOString(),
          },
        },
      );
    },
  );
}
