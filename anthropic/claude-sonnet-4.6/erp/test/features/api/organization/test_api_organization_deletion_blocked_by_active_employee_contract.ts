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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_contracts_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_contracts_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_employee_contract } from "../../../prepare/prepare_random_erp_hrm_employee_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_deletion_blocked_by_active_employee_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (Owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a new organization using the generation utility
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch context to the new organization
  const orgMemberDetail =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      ownerConnection,
      { organizationId: organization.id },
    );
  typia.assert(orgMemberDetail);
  // 4. Retrieve the owner's organization member record to get organizationMemberId
  const memberPage =
    await api.functional.erpHrm.member.organizationMembers.index(
      ownerConnection,
      {
        body: {} satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(memberPage);
  // The page should have at least one member (the owner)
  TestValidator.predicate(
    "owner organization member exists",
    memberPage.data.length > 0,
  );
  const organizationMemberId = memberPage.data[0]!.id;
  // 5. Create an active employee contract (startDate = past, endDate = null / open-ended)
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const contract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      ownerConnection,
      {
        params: { organizationMemberId },
        body: {
          startDate: pastDate.toISOString(),
          endDate: null,
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(contract);
  TestValidator.predicate("contract is active", contract.isActive === true);
  TestValidator.predicate(
    "contract has null end date",
    contract.endDate === null,
  );
  // 6. Attempt to delete the organization — should be blocked with HTTP 422
  await TestValidator.httpError(
    "organization deletion blocked by active employee contract",
    422,
    async () => {
      await api.functional.erpHrm.member.organizations.erase(ownerConnection, {
        organizationId: organization.id,
      });
    },
  );
}
