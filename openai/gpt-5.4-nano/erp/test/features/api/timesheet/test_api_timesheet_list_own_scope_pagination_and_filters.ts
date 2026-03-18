import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_list_own_scope_pagination_and_filters(
  connection: api.IConnection,
): Promise<void> {
  const memberBaseConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 3 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: `https://${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphabets(6)}`,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberBaseConnection, {
    body: credentials,
  });
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // Scenario 1
  const page1Limit10: IErpHrmTimeTrackingTimesheet.IRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const page1 = await api.functional.erpHrmTimeTracking.member.timesheets.index(
    memberConnection,
    { body: page1Limit10 },
  );
  typia.assert(page1);
  TestValidator.equals("page current", page1.pagination.current, 1);
  TestValidator.equals("page limit", page1.pagination.limit, 10);
  const expectedPages =
    page1.pagination.records === 0
      ? 0
      : Math.ceil(page1.pagination.records / page1.pagination.limit);
  TestValidator.equals("page pages", page1.pagination.pages, expectedPages);
  TestValidator.predicate("data is ordered by week_start_at desc", () => {
    for (let i = 0; i + 1 < page1.data.length; i++) {
      const a = new Date(page1.data[i]!.week_start_at).getTime();
      const b = new Date(page1.data[i + 1]!.week_start_at).getTime();
      if (a < b) return false;
    }
    return true;
  });
  let first = page1.data[0];
  if (!first) {
    // Try again with larger page size to reduce flakiness.
    const page1Limit100: IErpHrmTimeTrackingTimesheet.IRequest = {
      page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 100 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    };
    const page100 =
      await api.functional.erpHrmTimeTracking.member.timesheets.index(
        memberConnection,
        { body: page1Limit100 },
      );
    typia.assert(page100);
    TestValidator.equals("page current (retry)", page100.pagination.current, 1);
    TestValidator.equals("page limit (retry)", page100.pagination.limit, 100);
    const expectedRetryPages =
      page100.pagination.records === 0
        ? 0
        : Math.ceil(page100.pagination.records / page100.pagination.limit);
    TestValidator.equals(
      "page pages (retry)",
      page100.pagination.pages,
      expectedRetryPages,
    );
    first = page100.data[0];
    TestValidator.predicate("if still empty, records must be 0", () =>
      page100.data.length === 0 ? page100.pagination.records === 0 : true,
    );
  }
  // If no timesheets exist for this member, stop after scenario 1 validations.
  if (!first) return;
  // Scenario 2
  const requestedStatus = first.status;
  const weekStartAt = first.week_start_at;
  const weekEndAt = first.week_end_at;
  const filtered =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: requestedStatus,
          weekStartAt,
          weekEndAt,
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals("filtered current", filtered.pagination.current, 1);
  TestValidator.equals("filtered limit", filtered.pagination.limit, 20);
  const expectedFilteredPages =
    filtered.pagination.records === 0
      ? 0
      : Math.ceil(filtered.pagination.records / filtered.pagination.limit);
  TestValidator.equals(
    "filtered pages",
    filtered.pagination.pages,
    expectedFilteredPages,
  );
  const startMs = new Date(weekStartAt).getTime();
  const endMs = new Date(weekEndAt).getTime();
  TestValidator.predicate("all items match status", () =>
    filtered.data.every((t) => t.status === requestedStatus),
  );
  TestValidator.predicate("all items fit week range", () =>
    filtered.data.every((t) => {
      const itemStart = new Date(t.week_start_at).getTime();
      const itemEnd = new Date(t.week_end_at).getTime();
      return itemStart >= startMs && itemEnd <= endMs;
    }),
  );
  // Scenario 3
  const callerEmployeeId: string = first.employee.id;
  let syntheticEmployeeId = typia.random<string & tags.Format<"uuid">>();
  if (syntheticEmployeeId === callerEmployeeId) {
    syntheticEmployeeId = typia.random<string & tags.Format<"uuid">>();
  }
  const leaked =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          employeeId: syntheticEmployeeId,
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(leaked);
  TestValidator.predicate("no leakage: all returned employees are caller", () =>
    leaked.data.every((t) => t.employee.id === callerEmployeeId),
  );
}
