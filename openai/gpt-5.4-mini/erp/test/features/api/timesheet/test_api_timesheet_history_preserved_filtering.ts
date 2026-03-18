import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_history_preserved_filtering(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const list = await api.functional.hrmTimeTracking.member.timesheets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "-weekStart",
      } satisfies IHrmTimeTrackingTimesheet.IRequest,
    },
  );
  typia.assert(list);
  TestValidator.predicate(
    "pagination page should be positive",
    list.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    list.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    list.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    list.pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested page should be returned",
    list.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit should be returned",
    list.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "data length should not exceed requested limit",
    list.data.length <= 20,
  );
  if (list.data.length > 0) {
    const first = list.data[0];
    typia.assert(first);
    const filteredByStatus =
      await api.functional.hrmTimeTracking.member.timesheets.index(
        memberConnection,
        {
          body: {
            status: first.status,
            page: 1,
            limit: 20,
            sort: "-weekStart",
          } satisfies IHrmTimeTrackingTimesheet.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    TestValidator.predicate(
      "status-filtered results should only include the requested status",
      filteredByStatus.data.every((item) => item.status === first.status),
    );
    const weekRangeFiltered =
      await api.functional.hrmTimeTracking.member.timesheets.index(
        memberConnection,
        {
          body: {
            weekStart: first.weekStart,
            weekEnd: first.weekEnd,
            page: 1,
            limit: 20,
            sort: "-weekStart",
          } satisfies IHrmTimeTrackingTimesheet.IRequest,
        },
      );
    typia.assert(weekRangeFiltered);
    TestValidator.predicate(
      "week-range-filtered results should remain within the requested range",
      weekRangeFiltered.data.every(
        (item) =>
          item.weekStart >= first.weekStart && item.weekEnd <= first.weekEnd,
      ),
    );
    const secondPage =
      await api.functional.hrmTimeTracking.member.timesheets.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 20,
            sort: "-weekStart",
          } satisfies IHrmTimeTrackingTimesheet.IRequest,
        },
      );
    typia.assert(secondPage);
    const firstPageIds = new Set(list.data.map((item) => item.id));
    const duplicateOnSecondPage = secondPage.data.some((item) =>
      firstPageIds.has(item.id),
    );
    TestValidator.predicate(
      "pagination should not duplicate records already seen on page 1",
      !duplicateOnSecondPage,
    );
  }
}
