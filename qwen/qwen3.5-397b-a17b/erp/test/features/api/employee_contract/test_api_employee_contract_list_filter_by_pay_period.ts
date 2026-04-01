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
 * Test contract list filtering by pay_period.
 *
 * This test validates that employees can filter their contract history by payment
 * frequency (hourly, daily, weekly, monthly). The test:
 * 1. Registers a new member account
 * 2. Queries contracts with different pay_period filter values
 * 3. Verifies all returned contracts match the filter criteria
 * 4. Validates pagination metadata is correct
 */
export async function test_api_employee_contract_list_filter_by_pay_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test filtering by different pay_period values
  const payPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  for (const payPeriod of payPeriods) {
    // Generate random employee UUID for the query
    const employeeId = typia.random<string & tags.Format<"uuid">>();
    // Query contracts with pay_period filter
    const response =
      await api.functional.hrmPlatform.member.employees.contracts.index(
        memberConnection,
        {
          employeeId: employeeId,
          body: {
            pay_period: payPeriod,
            page: 1,
            limit: 20,
          } satisfies IHrmPlatformEmployeeContract.IRequest,
        },
      );
    typia.assert(response);
    // 3. Validate pagination metadata
    TestValidator.predicate(
      "current page is valid",
      response.pagination.current >= 1,
    );
    TestValidator.predicate("limit is valid", response.pagination.limit >= 1);
    TestValidator.predicate(
      "records count is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count is non-negative",
      response.pagination.pages >= 0,
    );
    // 4. Validate all returned contracts match the pay_period filter
    for (const contract of response.data) {
      TestValidator.equals(
        `contract pay_period matches filter ${payPeriod}`,
        contract.pay_period,
        payPeriod,
      );
    }
  }
  // 5. Test without pay_period filter to ensure it returns all contracts
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const allContractsResponse =
    await api.functional.hrmPlatform.member.employees.contracts.index(
      memberConnection,
      {
        employeeId: employeeId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformEmployeeContract.IRequest,
      },
    );
  typia.assert(allContractsResponse);
  TestValidator.predicate(
    "pagination is valid",
    allContractsResponse.pagination.current >= 1,
  );
}
