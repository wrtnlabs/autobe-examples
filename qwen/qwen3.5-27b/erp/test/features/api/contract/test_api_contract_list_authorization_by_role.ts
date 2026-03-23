import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

/**
 * Test role-based access control for contract listing endpoint.
 * Validates that admins with employee management permission can view all
 * organization contracts, while regular employees can only view their own
 * contracts. Tests authorization boundaries, empty state handling, and
 * organization scoping enforcement.
 */
export async function test_api_contract_list_authorization_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create and authenticate member1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  typia.assert(member1Auth);
  // 3. Create and authenticate member2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  typia.assert(member2Auth);
  // 4. Create contract for member1 as admin
  const contract1 = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        employee_id: member1Auth.id,
        start_at: new Date().toISOString(),
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IHrmPlatformContract.ICreate,
    },
  );
  typia.assert(contract1);
  // 5. Create contract for member2 as admin
  const contract2 = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        employee_id: member2Auth.id,
        start_at: new Date().toISOString(),
        pay_rate: 60000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IHrmPlatformContract.ICreate,
    },
  );
  typia.assert(contract2);
  // 6. Test admin can list all contracts (should see both)
  const adminContracts = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(adminContracts);
  TestValidator.equals(
    "admin sees all contracts",
    adminContracts.data.length,
    2,
  );
  TestValidator.equals(
    "admin pagination records",
    adminContracts.pagination.records,
    2,
  );
  // Verify admin can see both contracts
  const adminContractIds = adminContracts.data.map((c) => c.id);
  TestValidator.predicate(
    "admin sees contract1",
    adminContractIds.includes(contract1.id),
  );
  TestValidator.predicate(
    "admin sees contract2",
    adminContractIds.includes(contract2.id),
  );
  // 7. Test member1 can only see their own contract
  const member1Contracts = await api.functional.hrmPlatform.contracts.index(
    member1Connection,
    {
      body: {} satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(member1Contracts);
  TestValidator.equals(
    "member1 sees only own contract",
    member1Contracts.data.length,
    1,
  );
  TestValidator.equals(
    "member1 contract matches",
    member1Contracts.data[0].id,
    contract1.id,
  );
  TestValidator.predicate(
    "member1 does not see member2 contract",
    !member1Contracts.data.some((c) => c.id === contract2.id),
  );
  // 8. Test member2 can only see their own contract
  const member2Contracts = await api.functional.hrmPlatform.contracts.index(
    member2Connection,
    {
      body: {} satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(member2Contracts);
  TestValidator.equals(
    "member2 sees only own contract",
    member2Contracts.data.length,
    1,
  );
  TestValidator.equals(
    "member2 contract matches",
    member2Contracts.data[0].id,
    contract2.id,
  );
  TestValidator.predicate(
    "member2 does not see member1 contract",
    !member2Contracts.data.some((c) => c.id === contract1.id),
  );
  // 9. Test edge case: create member3 with no contracts
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {});
  typia.assert(member3Auth);
  const member3Contracts = await api.functional.hrmPlatform.contracts.index(
    member3Connection,
    {
      body: {} satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(member3Contracts);
  TestValidator.equals(
    "member3 with no contracts returns empty array",
    member3Contracts.data.length,
    0,
  );
  TestValidator.equals(
    "member3 pagination records is zero",
    member3Contracts.pagination.records,
    0,
  );
  TestValidator.equals(
    "member3 pagination pages is zero",
    member3Contracts.pagination.pages,
    0,
  );
  // 10. Test filtering by employee_id works correctly
  const filteredByMember1 = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        employee_id: member1Auth.id,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(filteredByMember1);
  TestValidator.equals(
    "filter by member1 returns only member1 contract",
    filteredByMember1.data.length,
    1,
  );
  TestValidator.equals(
    "filtered contract matches member1",
    filteredByMember1.data[0].id,
    contract1.id,
  );
  // 11. Test status filter (active contracts)
  const activeContracts = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(activeContracts);
  TestValidator.equals(
    "active status filter returns both contracts",
    activeContracts.data.length,
    2,
  );
}
