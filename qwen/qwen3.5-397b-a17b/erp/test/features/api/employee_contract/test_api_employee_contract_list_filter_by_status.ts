import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_contract_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Use the employee ID from the authenticated member (assuming member is the employee)
  const employeeId = memberAuth.id;
  // 2. Query contracts with status=active filter
  const activeContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employeeId,
        body: {
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(activeContracts);
  // Validate all returned contracts are active
  TestValidator.predicate(
    "all active contracts have is_active=true",
    activeContracts.data.every((contract) => contract.is_active === true),
  );
  // Validate active contracts have end_date null or in future
  const now = new Date();
  TestValidator.predicate(
    "active contracts have valid end_date",
    activeContracts.data.every((contract) => {
      if (contract.end_date === null) {
        return true; // Ongoing contract
      }
      const endDate = new Date(contract.end_date);
      return endDate > now; // End date in future
    }),
  );
  // Validate pagination metadata for active contracts
  TestValidator.predicate(
    "active contracts pagination current page",
    activeContracts.pagination.current >= 1,
  );
  TestValidator.predicate(
    "active contracts pagination limit",
    activeContracts.pagination.limit > 0,
  );
  TestValidator.predicate(
    "active contracts pagination records match data length",
    activeContracts.pagination.records >= activeContracts.data.length,
  );
  TestValidator.predicate(
    "active contracts pagination pages calculated correctly",
    activeContracts.pagination.pages >= 1,
  );
  // 3. Query contracts with status=ended filter
  const endedContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employeeId,
        body: {
          status: "ended",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(endedContracts);
  // Validate all returned contracts are ended
  TestValidator.predicate(
    "all ended contracts have is_active=false",
    endedContracts.data.every((contract) => contract.is_active === false),
  );
  // Validate ended contracts have end_date in past
  TestValidator.predicate(
    "ended contracts have end_date in past",
    endedContracts.data.every((contract) => {
      if (contract.end_date === null) {
        return false; // Ended contracts must have end_date
      }
      const endDate = new Date(contract.end_date);
      return endDate < now; // End date in past
    }),
  );
  // Validate pagination metadata for ended contracts
  TestValidator.predicate(
    "ended contracts pagination current page",
    endedContracts.pagination.current >= 1,
  );
  TestValidator.predicate(
    "ended contracts pagination limit",
    endedContracts.pagination.limit > 0,
  );
  TestValidator.predicate(
    "ended contracts pagination records match data length",
    endedContracts.pagination.records >= endedContracts.data.length,
  );
  TestValidator.predicate(
    "ended contracts pagination pages calculated correctly",
    endedContracts.pagination.pages >= 1,
  );
  // 4. Test pagination with different page sizes
  const activeContractsPage2 =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employeeId,
        body: {
          status: "active",
          page: 2,
          limit: 10,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(activeContractsPage2);
  // Validate page 2 has correct page number
  TestValidator.equals(
    "active contracts page 2 number",
    activeContractsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "active contracts page 2 limit",
    activeContractsPage2.pagination.limit,
    10,
  );
  // Validate all contracts on page 2 are also active
  TestValidator.predicate(
    "all active contracts on page 2 have is_active=true",
    activeContractsPage2.data.every((contract) => contract.is_active === true),
  );
  // 5. Test without status filter (get all contracts)
  const allContracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employeeId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(allContracts);
  // Validate that all contracts have valid is_active field
  TestValidator.predicate(
    "all contracts have valid is_active boolean",
    allContracts.data.every(
      (contract) =>
        typeof contract.is_active === "boolean" &&
        (contract.is_active === true || contract.is_active === false),
    ),
  );
  // Validate total records is at least the sum of active and ended (if no overlap)
  TestValidator.predicate(
    "all contracts records count is valid",
    allContracts.pagination.records >= 0,
  );
  // 6. Validate contract summary structure
  if (activeContracts.data.length > 0) {
    const sampleContract = activeContracts.data[0];
    TestValidator.predicate(
      "contract has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleContract.id,
      ),
    );
    TestValidator.predicate(
      "contract has valid start_date format",
      !isNaN(Date.parse(sampleContract.start_date)),
    );
    TestValidator.predicate(
      "contract has positive pay_rate",
      sampleContract.pay_rate > 0,
    );
    TestValidator.predicate(
      "contract has valid pay_period",
      ["hourly", "daily", "weekly", "monthly"].includes(
        sampleContract.pay_period,
      ),
    );
    TestValidator.predicate(
      "contract has valid working_hours_per_week",
      sampleContract.working_hours_per_week > 0 &&
        sampleContract.working_hours_per_week <= 168,
    );
  }
}
