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

export async function test_api_employee_contract_access_denied_without_view_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (the org owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Member A creates an organization — member A becomes the owner
  const org = await generate_random_erp_hrm_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(org);
  // Step 3: Register member C (the target employee whose contract will be protected)
  // Capture the authorized result to get member C's platform-level member ID
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuthorized = await authorize_member_join(memberCConnection, {});
  const memberCPlatformId = memberCAuthorized.member.id;
  // Step 4: Member A adds member C to the organization using the owner's role ID
  // (The owner role ID is the only role we can reliably obtain from the org response)
  const orgOwnersRoleId = org.owner.role.id;
  const memberCOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberCPlatformId,
          roleId: orgOwnersRoleId,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(memberCOrgMember);
  const memberCOrgMemberId = memberCOrgMember.id;
  // Step 5: Member A creates a contract for member C
  const contract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      memberAConnection,
      {
        params: { organizationMemberId: memberCOrgMemberId },
      },
    );
  typia.assert(contract);
  const contractId = contract.id;
  // Step 6: Register member B — who is NOT part of any organization
  // Member B has no org membership and therefore no employee_view permission
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 7: Member B (unaffiliated with the org) attempts to access member C's contract
  // Expected: HTTP 403 Forbidden because member B:
  //   - is NOT the target organization member (member C)
  //   - does NOT hold the employee_view permission in the organization
  // This validates the two-condition authorization check:
  //   either self-access OR employee_view permission must be satisfied
  await TestValidator.httpError(
    "access denied without view permission",
    403,
    async () => {
      await api.functional.erpHrm.member.organizationMembers.contracts.at(
        memberBConnection,
        {
          organizationMemberId: memberCOrgMemberId,
          contractId: contractId,
        },
      );
    },
  );
}
