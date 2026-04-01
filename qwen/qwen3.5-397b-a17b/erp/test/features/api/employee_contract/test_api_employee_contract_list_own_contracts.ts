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

/**
 * Test that an employee can successfully retrieve their own contract history.
 * 1. Member registers via member join to get authentication
 * 2. Member calls the contract list endpoint with their employeeId
 * 3. Verify the response structure and pagination metadata
 * 4. Validate contract summaries include all required fields
 * 5. Verify is_active logic matches end_date state
 */
export async function test_api_employee_contract_list_own_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Call contract list endpoint with member's ID as employeeId
  const contracts =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: member.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(contracts);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    contracts.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", contracts.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    contracts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    contracts.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pages calculation",
    contracts.pagination.pages,
    Math.ceil(contracts.pagination.records / contracts.pagination.limit),
  );
  TestValidator.predicate(
    "data length within limit",
    contracts.data.length <= contracts.pagination.limit,
  );
  // 4. Validate each contract summary
  for (const contract of contracts.data) {
    // Validate is_active logic based on end_date
    const now = new Date();
    const endDate = contract.end_date ? new Date(contract.end_date) : null;
    const expectedIsActive = endDate === null || endDate > now;
    TestValidator.equals(
      `is_active for contract ${contract.id}`,
      contract.is_active,
      expectedIsActive,
    );
    // Validate required fields exist and have valid values
    TestValidator.predicate(
      `pay_rate positive for ${contract.id}`,
      contract.pay_rate > 0,
    );
    TestValidator.predicate(
      `working_hours_per_week positive for ${contract.id}`,
      contract.working_hours_per_week > 0,
    );
    TestValidator.predicate(
      `start_date before end_date for ${contract.id}`,
      !contract.end_date ||
        new Date(contract.start_date) <= new Date(contract.end_date),
    );
  }
}
