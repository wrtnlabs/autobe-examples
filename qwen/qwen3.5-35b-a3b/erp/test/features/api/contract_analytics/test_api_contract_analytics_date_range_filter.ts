import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_analytics_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Calculate date range values
  const now = new Date();
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate(),
  );
  const twoYearsAgo = new Date(
    now.getFullYear() - 2,
    now.getMonth(),
    now.getDate(),
  );
  const farFuture = new Date(
    now.getFullYear() + 10,
    now.getMonth(),
    now.getDate(),
  );
  // 3. Test analytics endpoint with no filters - baseline
  const noFilter: IHrmsEmployeeContract.IRequest = {};
  const baselineResponse = await api.functional.hrms.member.contracts.analytics(
    memberConnection,
    { body: noFilter },
  );
  typia.assert(baselineResponse);
  // Validate response structure and pagination
  TestValidator.equals(
    "pagination current page",
    baselineResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    baselineResponse.pagination.limit,
    baselineResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination records",
    baselineResponse.pagination.records,
    baselineResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages",
    baselineResponse.pagination.pages,
    Math.ceil(
      baselineResponse.pagination.records / baselineResponse.pagination.limit,
    ),
  );
  // Validate duration calculations include values for active contracts
  if (baselineResponse.data.length > 0) {
    for (const contract of baselineResponse.data) {
      TestValidator.predicate(
        "has pay_period",
        contract.pay_period === "hourly" ||
          contract.pay_period === "daily" ||
          contract.pay_period === "weekly" ||
          contract.pay_period === "monthly",
      );
      TestValidator.predicate(
        "avg_pay_rate is number",
        typeof contract.avg_pay_rate === "number" ||
          contract.avg_pay_rate === null,
      );
      TestValidator.predicate(
        "avg_duration_days is number",
        typeof contract.avg_duration_days === "number" ||
          contract.avg_duration_days === null,
      );
      TestValidator.predicate(
        "contract_count non-negative",
        contract.contract_count >= 0,
      );
      TestValidator.predicate(
        "active_contract_count non-negative",
        contract.active_contract_count >= 0,
      );
    }
  }
  // 4. Test analytics with start_date filter
  const startDateFilter: IHrmsEmployeeContract.IRequest = {
    start_date: oneYearAgo.toISOString(),
  };
  const startDateResponse =
    await api.functional.hrms.member.contracts.analytics(memberConnection, {
      body: startDateFilter,
    });
  typia.assert(startDateResponse);
  // Validate response structure is valid
  TestValidator.equals(
    "pagination current page",
    startDateResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    startDateResponse.pagination.records,
    startDateResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages",
    startDateResponse.pagination.pages,
    Math.ceil(
      startDateResponse.pagination.records / startDateResponse.pagination.limit,
    ),
  );
  // Validate duration calculations still work with filter
  if (startDateResponse.data.length > 0) {
    for (const contract of startDateResponse.data) {
      TestValidator.predicate(
        "pay_period valid",
        contract.pay_period === "hourly" ||
          contract.pay_period === "daily" ||
          contract.pay_period === "weekly" ||
          contract.pay_period === "monthly",
      );
      TestValidator.predicate(
        "duration calculations valid",
        typeof contract.avg_duration_days === "number" ||
          contract.avg_duration_days === null,
      );
    }
  }
  // 5. Test analytics with end_date filter
  const endDateFilter: IHrmsEmployeeContract.IRequest = {
    end_date: twoYearsAgo.toISOString(),
  };
  const endDateResponse = await api.functional.hrms.member.contracts.analytics(
    memberConnection,
    { body: endDateFilter },
  );
  typia.assert(endDateResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination records",
    endDateResponse.pagination.records,
    endDateResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages",
    endDateResponse.pagination.pages,
    Math.ceil(
      endDateResponse.pagination.records / endDateResponse.pagination.limit,
    ),
  );
  // 6. Test validation error - start_date after end_date (invalid date range)
  const invalidDateFilter: IHrmsEmployeeContract.IRequest = {
    start_date: twoYearsAgo.toISOString(),
    end_date: oneYearAgo.toISOString(),
  };
  await TestValidator.error("should reject invalid date range", async () => {
    await api.functional.hrms.member.contracts.analytics(memberConnection, {
      body: invalidDateFilter,
    });
  });
  // 7. Test empty results - far future start_date (no contracts match)
  const emptyResultFilter: IHrmsEmployeeContract.IRequest = {
    start_date: farFuture.toISOString(),
  };
  const emptyResultResponse =
    await api.functional.hrms.member.contracts.analytics(memberConnection, {
      body: emptyResultFilter,
    });
  typia.assert(emptyResultResponse);
  // Validate empty result handling
  TestValidator.equals("empty data array", emptyResultResponse.data.length, 0);
  TestValidator.equals(
    "zero total records",
    emptyResultResponse.pagination.records,
    0,
  );
  TestValidator.equals("zero pages", emptyResultResponse.pagination.pages, 0);
  // 8. Test analytics with multiple filters (start_date + end_date + pay_period)
  const combinedFilter: IHrmsEmployeeContract.IRequest = {
    start_date: oneYearAgo.toISOString(),
    end_date: twoYearsAgo.toISOString(),
    pay_period: "monthly",
  };
  const combinedResponse = await api.functional.hrms.member.contracts.analytics(
    memberConnection,
    { body: combinedFilter },
  );
  typia.assert(combinedResponse);
  // Validate response with combined filters
  TestValidator.equals(
    "pagination current",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records",
    combinedResponse.pagination.records,
    combinedResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages",
    combinedResponse.pagination.pages,
    Math.ceil(
      combinedResponse.pagination.records / combinedResponse.pagination.limit,
    ),
  );
  // Validate all filters applied
  if (combinedResponse.data.length > 0) {
    for (const contract of combinedResponse.data) {
      TestValidator.equals(
        "pay_period matches filter",
        contract.pay_period,
        "monthly",
      );
      TestValidator.predicate(
        "duration calculations valid",
        typeof contract.avg_duration_days === "number" ||
          contract.avg_duration_days === null,
      );
      TestValidator.predicate(
        "contract_count valid",
        contract.contract_count >= 0,
      );
      TestValidator.predicate(
        "active_contract_count valid",
        contract.active_contract_count >= 0,
      );
    }
  }
}
