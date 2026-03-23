import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

/**
 * Test retrieving the complete audit trail of contract modifications for an employee contract with multiple versions.
 *
 * Setup:
 * 1. Authenticate as admin using authorize_admin_join utility
 * 2. Create an initial contract for an employee (snapshot #1 created automatically)
 * 3. Update the active contract to modify pay rate (snapshot #2 created)
 * 4. Update the contract again to modify working hours (snapshot #3 created)
 *
 * Test Execution:
 * 1. Call PATCH /hrmPlatform/contracts/{contractId}/snapshots with the contract ID
 * 2. Verify response contains paginated list with all 3 snapshots
 * 3. Verify snapshots are ordered by created_at descending (most recent first)
 * 4. Verify each snapshot contains: id, start_at, end_at, pay_rate, pay_period, working_hours_per_week, created_at
 * 5. Verify snapshot data reflects the actual contract state at each modification point
 * 6. Verify pagination metadata is correct (current page, total records, total pages)
 *
 * Expected Results:
 * - HTTP 200 OK
 * - Response body contains IPageIHrmPlatformContractSnapshot.ISummary
 * - All snapshots are present and accurately reflect contract history
 * - Snapshots are immutable and cannot be modified
 */
export async function test_api_contract_snapshots_retrieve_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create initial contract (snapshot #1)
  const initialPayRate = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const initialWorkingHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<60>
  >();
  const contract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        pay_rate: initialPayRate,
        working_hours_per_week: initialWorkingHours,
        pay_period: "monthly",
        start_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(contract);
  // 3. Update contract to modify pay rate (snapshot #2)
  const updatedPayRate = initialPayRate + 1000;
  const updatedContract = await api.functional.hrmPlatform.contracts.update(
    adminConnection,
    {
      contractId: contract.id,
      body: {
        pay_rate: updatedPayRate,
      } satisfies IHrmPlatformContract.IUpdate,
    },
  );
  typia.assert(updatedContract);
  // 4. Update contract again to modify working hours (snapshot #3)
  const updatedWorkingHours = initialWorkingHours + 5;
  const finalContract = await api.functional.hrmPlatform.contracts.update(
    adminConnection,
    {
      contractId: contract.id,
      body: {
        working_hours_per_week: updatedWorkingHours,
      } satisfies IHrmPlatformContract.IUpdate,
    },
  );
  typia.assert(finalContract);
  // 5. Retrieve contract snapshots
  const snapshots = await api.functional.hrmPlatform.contracts.snapshots.index(
    adminConnection,
    {
      contractId: contract.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformContractSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 6. Verify pagination metadata
  TestValidator.equals(
    "total snapshots count",
    snapshots.pagination.records,
    3,
  );
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("total pages", snapshots.pagination.pages, 1);
  TestValidator.equals("limit", snapshots.pagination.limit, 20);
  // 7. Verify snapshot count
  TestValidator.equals("snapshot array length", snapshots.data.length, 3);
  // 8. Verify snapshots are ordered by created_at descending (most recent first)
  TestValidator.predicate("snapshots ordered descending", () => {
    for (let i = 1; i < snapshots.data.length; i++) {
      const prev = new Date(snapshots.data[i - 1].created_at).getTime();
      const curr = new Date(snapshots.data[i].created_at).getTime();
      if (prev < curr) return false;
    }
    return true;
  });
  // 9. Verify snapshot #3 (most recent) has updated working hours
  TestValidator.equals(
    "snapshot 3 working hours",
    snapshots.data[0].working_hours_per_week,
    updatedWorkingHours,
  );
  TestValidator.equals(
    "snapshot 3 pay rate",
    snapshots.data[0].pay_rate,
    updatedPayRate,
  );
  TestValidator.equals(
    "snapshot 3 pay period",
    snapshots.data[0].pay_period,
    "monthly",
  );
  // 10. Verify snapshot #2 has updated pay rate but original working hours
  TestValidator.equals(
    "snapshot 2 pay rate",
    snapshots.data[1].pay_rate,
    updatedPayRate,
  );
  TestValidator.equals(
    "snapshot 2 working hours",
    snapshots.data[1].working_hours_per_week,
    initialWorkingHours,
  );
  TestValidator.equals(
    "snapshot 2 pay period",
    snapshots.data[1].pay_period,
    "monthly",
  );
  // 11. Verify snapshot #1 (oldest) has original values
  TestValidator.equals(
    "snapshot 1 pay rate",
    snapshots.data[2].pay_rate,
    initialPayRate,
  );
  TestValidator.equals(
    "snapshot 1 working hours",
    snapshots.data[2].working_hours_per_week,
    initialWorkingHours,
  );
  TestValidator.equals(
    "snapshot 1 pay period",
    snapshots.data[2].pay_period,
    "monthly",
  );
}
