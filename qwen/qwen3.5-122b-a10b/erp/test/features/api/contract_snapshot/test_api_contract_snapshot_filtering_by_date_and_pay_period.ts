import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_snapshot_filtering_by_date_and_pay_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test filtering by start_date_from
  const startDateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filteredByStartDateFrom =
    await api.functional.hrmPlatform.member.contractSnapshots.index(
      memberConnection,
      {
        body: {
          start_date_from: startDateFrom,
          limit: 20,
        } satisfies IHrmPlatformContractSnapshot.IRequest,
      },
    );
  typia.assert(filteredByStartDateFrom);
  // Validate all returned snapshots have start_date >= startDateFrom
  for (const snapshot of filteredByStartDateFrom.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot start_date >= startDateFrom",
      new Date(snapshot.start_date).getTime() >=
        new Date(startDateFrom).getTime(),
    );
  }
  // 3. Test filtering by start_date_to
  const startDateTo = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filteredByStartDateTo =
    await api.functional.hrmPlatform.member.contractSnapshots.index(
      memberConnection,
      {
        body: {
          start_date_to: startDateTo,
          limit: 20,
        } satisfies IHrmPlatformContractSnapshot.IRequest,
      },
    );
  typia.assert(filteredByStartDateTo);
  // Validate all returned snapshots have start_date <= startDateTo
  for (const snapshot of filteredByStartDateTo.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot start_date <= startDateTo",
      new Date(snapshot.start_date).getTime() <=
        new Date(startDateTo).getTime(),
    );
  }
  // 4. Test filtering by pay_period
  const payPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  const selectedPayPeriod = RandomGenerator.pick(payPeriods);
  const filteredByPayPeriod =
    await api.functional.hrmPlatform.member.contractSnapshots.index(
      memberConnection,
      {
        body: {
          pay_period: selectedPayPeriod,
          limit: 20,
        } satisfies IHrmPlatformContractSnapshot.IRequest,
      },
    );
  typia.assert(filteredByPayPeriod);
  // Validate all returned snapshots have matching pay_period
  for (const snapshot of filteredByPayPeriod.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot pay_period matches filter",
      snapshot.pay_period,
      selectedPayPeriod,
    );
  }
  // 5. Test combined filtering (date range + pay period)
  const combinedFilter =
    await api.functional.hrmPlatform.member.contractSnapshots.index(
      memberConnection,
      {
        body: {
          start_date_from: startDateFrom,
          start_date_to: startDateTo,
          pay_period: selectedPayPeriod,
          limit: 20,
        } satisfies IHrmPlatformContractSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate all snapshots meet all filter criteria
  for (const snapshot of combinedFilter.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "combined: start_date >= startDateFrom",
      new Date(snapshot.start_date).getTime() >=
        new Date(startDateFrom).getTime(),
    );
    TestValidator.predicate(
      "combined: start_date <= startDateTo",
      new Date(snapshot.start_date).getTime() <=
        new Date(startDateTo).getTime(),
    );
    TestValidator.equals(
      "combined: pay_period matches",
      snapshot.pay_period,
      selectedPayPeriod,
    );
  }
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination.current is valid",
    combinedFilter.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    combinedFilter.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is valid",
    combinedFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is valid",
    combinedFilter.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length matches pagination.limit constraint",
    combinedFilter.data.length <= combinedFilter.pagination.limit,
  );
  TestValidator.predicate(
    "data length matches pagination.records constraint",
    combinedFilter.data.length <= combinedFilter.pagination.records,
  );
}
