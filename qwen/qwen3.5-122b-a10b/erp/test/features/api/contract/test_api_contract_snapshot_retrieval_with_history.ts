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

export async function test_api_contract_snapshot_retrieval_with_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
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
  // 2. Create an employee and their initial contract
  // Note: In simulation mode, the backend generates valid employee data
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const initialStartDate = new Date();
  const initialContract =
    await generate_random_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          start_date: initialStartDate.toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IHrmContract.ICreate,
      },
    );
  typia.assert(initialContract);
  const contractId: string & tags.Format<"uuid"> = initialContract.id;
  // 3. Create additional contracts for the same employee
  // Each new contract terminates the previous active contract
  const secondStartDate = new Date(initialStartDate);
  secondStartDate.setMonth(secondStartDate.getMonth() + 6);
  const secondContract =
    await generate_random_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          start_date: secondStartDate.toISOString(),
          pay_rate: 55000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IHrmContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // 4. Retrieve snapshots for the initial contract
  const snapshots =
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
  typia.assert(snapshots);
  // 5. Validate snapshot ordering (descending by created_at - most recent first)
  TestValidator.predicate(
    "snapshots returned in descending order by created_at",
    () => {
      for (let i = 0; i < snapshots.data.length - 1; i++) {
        if (
          new Date(snapshots.data[i].created_at) <
          new Date(snapshots.data[i + 1].created_at)
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 6. Validate snapshot count (should have at least the initial contract snapshot)
  TestValidator.predicate(
    "at least one snapshot exists for the contract",
    snapshots.data.length > 0,
  );
  // 7. Validate each snapshot has required fields and correct employee reference
  TestValidator.predicate(
    "each snapshot has required fields and employee reference",
    snapshots.data.every((snapshot) => {
      return (
        snapshot.id !== undefined &&
        snapshot.employee !== undefined &&
        snapshot.employee.id !== undefined &&
        snapshot.start_date !== undefined &&
        snapshot.pay_rate !== undefined &&
        snapshot.pay_period !== undefined &&
        snapshot.created_at !== undefined
      );
    }),
  );
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records matches data length",
    snapshots.pagination.records === snapshots.data.length,
  );
  // 9. Test pagination with different page parameters
  const page2Snapshots =
    await api.functional.hrm.member.employees.contracts.snapshots.index(
      memberConnection,
      {
        employeeId,
        contractId,
        body: {
          page: 2,
          limit: 1,
        } satisfies IHrmContractSnapshot.IRequest,
      },
    );
  typia.assert(page2Snapshots);
  TestValidator.equals(
    "pagination page 2 returns correct page number",
    page2Snapshots.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination page 2 respects limit of 1",
    page2Snapshots.data.length <= 1,
  );
}
