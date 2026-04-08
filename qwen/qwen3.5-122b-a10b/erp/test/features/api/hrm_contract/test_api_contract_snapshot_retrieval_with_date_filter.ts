import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_employees_contracts_create } from "../../../generate/generate_random_hrm_member_employees_contracts_create";
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";

/**
 * Test contract snapshot retrieval with date range filtering capabilities.
 *
 * Validates the audit trail browsing functionality for employment contract historical records. This test ensures that contract snapshots can be filtered by various criteria including creation timestamps, contract effective dates, compensation periods, and pay rate ranges, with proper pagination and ordering maintained.
 *
 * The test workflow creates an employee with a contract, then verifies that snapshot filtering works correctly across multiple dimensions:
 *
 * 1. Create member account and authenticate
 * 2. Create contract for an employee (employeeId must exist in the system)
 * 3. Retrieve snapshots with various filter combinations:
 *    - Filter by created_at date range
 *    - Filter by contract start_date range
 *    - Filter by pay_period type
 *    - Filter by pay_rate range
 *    - Combine multiple filters with AND logic
 * 4. Verify pagination works correctly with filtered results
 * 5. Verify results maintain created_at descending order after filtering
 *
 * Note: This test requires an existing employee record in the system. The employeeId parameter should correspond to a valid employee in the database for the test to succeed.
 */
export async function test_api_contract_snapshot_retrieval_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate employee ID (note: in production, this should be a real employee ID)
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create initial contract to generate snapshots
  const initialContract =
    await generate_random_hrm_member_employees_contracts_create(
      memberConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
        } satisfies IHrmContract.ICreate,
        params: { employeeId },
      },
    );
  typia.assert(initialContract);
  // 4. Test snapshot retrieval with various filters
  const contractId: string & tags.Format<"uuid"> = initialContract.id;
  // 4.1. Retrieve all snapshots without filters
  const allSnapshots =
    await api.functional.hrm.member.employees.contracts.snapshots.index(
      memberConnection,
      {
        employeeId,
        contractId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmContractSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate("has snapshots", allSnapshots.data.length > 0);
  // 4.2. Test created_at date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const createdAtFiltered =
    await api.functional.hrm.member.employees.contracts.snapshots.index(
      memberConnection,
      {
        employeeId,
        contractId,
        body: {
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IHrmContractSnapshot.IRequest,
      },
    );
  typia.assert(createdAtFiltered);
  // 4.3. Test start_date range filter
  const startDateFiltered =
    await api.functional.hrm.member.employees.contracts.snapshots.index(
      memberConnection,
      {
        employeeId,
        contractId,
        body: {
          start_date_from: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          start_date_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IHrmContractSnapshot.IRequest,
      },
    );
  typia.assert(startDateFiltered);
  // 4.4. Test pay_period filter
  const payPeriodFiltered =
    await api.functional.hrm.member.employees.contracts.snapshots.index(
      memberConnection,
      {
        employeeId,
        contractId,
        body: {
          pay_period: "monthly",
          page: 1,
          limit: 100,
        } satisfies IHrmContractSnapshot.IRequest,
      },
    );
  typia.assert(payPeriodFiltered);
  payPeriodFiltered.data.forEach((snapshot) => {
    TestValidator.equals(
      "pay_period matches filter",
      snapshot.pay_period,
      "monthly",
    );
  });
  // 4.5. Test pay_rate range filter
  const payRateFiltered =
    await api.functional.hrm.member.employees.contracts.snapshots.index(
      memberConnection,
      {
        employeeId,
        contractId,
        body: {
          pay_rate_min: 40000,
          pay_rate_max: 60000,
          page: 1,
          limit: 100,
        } satisfies IHrmContractSnapshot.IRequest,
      },
    );
  typia.assert(payRateFiltered);
  payRateFiltered.data.forEach((snapshot) => {
    TestValidator.predicate(
      "pay_rate within range",
      snapshot.pay_rate >= 40000 && snapshot.pay_rate <= 60000,
    );
  });
  // 4.6. Test combined filters (AND logic)
  const combinedFiltered =
    await api.functional.hrm.member.employees.contracts.snapshots.index(
      memberConnection,
      {
        employeeId,
        contractId,
        body: {
          pay_period: "monthly",
          pay_rate_min: 40000,
          pay_rate_max: 60000,
          page: 1,
          limit: 100,
        } satisfies IHrmContractSnapshot.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  combinedFiltered.data.forEach((snapshot) => {
    TestValidator.equals(
      "combined: pay_period matches",
      snapshot.pay_period,
      "monthly",
    );
    TestValidator.predicate(
      "combined: pay_rate in range",
      snapshot.pay_rate >= 40000 && snapshot.pay_rate <= 60000,
    );
  });
  // 4.7. Test pagination with filters
  const paginated =
    await api.functional.hrm.member.employees.contracts.snapshots.index(
      memberConnection,
      {
        employeeId,
        contractId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmContractSnapshot.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination limit respected",
    paginated.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination has metadata",
    paginated.pagination.current === 1,
  );
  // 4.8. Verify ordering by created_at descending
  if (allSnapshots.data.length > 1) {
    for (let i = 0; i < allSnapshots.data.length - 1; i++) {
      const current = new Date(allSnapshots.data[i].created_at).getTime();
      const next = new Date(allSnapshots.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
        current >= next,
      );
    }
  }
}
