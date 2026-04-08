import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_contract_snapshot_browse_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Test browsing with no filters (baseline)
  const baseline = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(baseline);
  // 3. Test browsing with employee_id filter
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const employeeFilter = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        employee_id: employeeId,
        page: 1,
        limit: 20,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(employeeFilter);
  TestValidator.predicate(
    "employee filter applied",
    employeeFilter.data.every((s) => s.employee.id === employeeId),
  );
  // 4. Test browsing with start_date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDateFilter = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        start_date_from: thirtyDaysAgo.toISOString(),
        start_date_to: now.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(startDateFilter);
  TestValidator.predicate(
    "start_date filter applied",
    startDateFilter.data.every((s) => {
      const snapshotDate = new Date(s.start_date);
      return snapshotDate >= thirtyDaysAgo && snapshotDate <= now;
    }),
  );
  // 5. Test browsing with pay_period filter
  const payPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  const selectedPayPeriod = RandomGenerator.pick(payPeriods);
  const payPeriodFilter = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        pay_period: selectedPayPeriod,
        page: 1,
        limit: 20,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(payPeriodFilter);
  TestValidator.predicate(
    "pay_period filter applied",
    payPeriodFilter.data.every((s) => s.pay_period === selectedPayPeriod),
  );
  // 6. Test browsing with pagination parameters
  const page2 = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // 7. Test with combined filters
  const combinedFilter = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        employee_id: employeeId,
        pay_period: selectedPayPeriod,
        start_date_from: thirtyDaysAgo.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(combinedFilter);
  // Validate combined filter results match all criteria
  if (combinedFilter.data.length > 0) {
    TestValidator.predicate(
      "combined filter employee",
      combinedFilter.data.every((s) => s.employee.id === employeeId),
    );
    TestValidator.predicate(
      "combined filter pay_period",
      combinedFilter.data.every((s) => s.pay_period === selectedPayPeriod),
    );
    TestValidator.predicate(
      "combined filter date range",
      combinedFilter.data.every((s) => {
        const snapshotDate = new Date(s.start_date);
        return snapshotDate >= thirtyDaysAgo && snapshotDate <= now;
      }),
    );
  }
  // 8. Test with different limit values
  const limit5 = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(limit5);
  TestValidator.predicate("limit 5 respects max", limit5.data.length <= 5);
  TestValidator.equals("limit 5 pagination", limit5.pagination.limit, 5);
  const limit100 = await api.functional.hrm.member.snapshots.index(
    memberConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IHrmContractSnapshot.IRequest,
    },
  );
  typia.assert(limit100);
  TestValidator.predicate(
    "limit 100 respects max",
    limit100.data.length <= 100,
  );
  TestValidator.equals("limit 100 pagination", limit100.pagination.limit, 100);
}
