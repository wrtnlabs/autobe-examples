import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
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
import { generate_random_erp_hrm_member_contracts_create } from "../../../generate/generate_random_erp_hrm_member_contracts_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_contract_retrieval_with_view_permission_for_other_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create viewer member who will have employee:view permission
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuth = await authorize_member_join(viewerConnection, {});
  // 2. Create shared organization (viewer becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      viewerConnection,
      {},
    );
  // 3. Create role with employee:view permission
  const viewerRole = await generate_random_erp_hrm_member_roles_create(
    viewerConnection,
    {
      body: {
        name: "HR Manager",
        permissions: [{ permission: "employee.view" }],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  // 4. Create owner member (different employee who will own the contract)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  // 5. Create organization member for contract owner
  const ownerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      viewerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: ownerAuth.id,
          roleId: viewerRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // 6. Create organization member for viewer with employee:view permission
  await generate_random_erp_hrm_member_organization_members_create(
    viewerConnection,
    {
      body: {
        organizationId: organization.id,
        userId: viewerAuth.id,
        roleId: viewerRole.id,
        employmentType: "full_time",
        isActive: true,
      } satisfies IErpHrmOrganizationMember.ICreate,
    },
  );
  // 7. Create employment contract for the owner employee
  const contract = await generate_random_erp_hrm_member_contracts_create(
    viewerConnection,
    {
      body: {
        organization_member_id: ownerOrgMember.id,
        employment_type: "full-time",
        start_date: new Date().toISOString(),
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IErpHrmContract.ICreate,
    },
  );
  // 8. Retrieve contract using viewer's connection (cross-employee access with view permission)
  const retrieved = await api.functional.erpHrm.member.contracts.at(
    viewerConnection,
    {
      contractId: contract.id,
    },
  );
  typia.assert(retrieved);
  // 9. Validate contract details show owner's information, not viewer's
  TestValidator.equals(
    "contract organization member matches owner",
    retrieved.organizationMember.id,
    ownerOrgMember.id,
  );
  TestValidator.equals(
    "contract user matches owner",
    retrieved.organizationMember.user.id,
    ownerAuth.id,
  );
  TestValidator.notEquals(
    "contract user is not viewer",
    retrieved.organizationMember.user.id,
    viewerAuth.id,
  );
}
