import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_list_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection via utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Update connection with authorization token
  memberConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Get reference dates for testing
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
  // Calculate dates for different weeks
  const twoWeeksAgo = new Date(weekStart);
  twoWeeksAgo.setDate(weekStart.getDate() - 14);
  const oneWeekAgo = new Date(weekStart);
  oneWeekAgo.setDate(weekStart.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);
  // Test 1: Query without filters - get all timesheets for reference
  const allTimesheets = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(allTimesheets);
  // Test 2: Filter with weekStartDate.gte (only) - should return timesheets from oneWeekAgo onwards
  const fromOneWeekAgo = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        weekStartDate: {
          gte: oneWeekAgo.toISOString(),
        },
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(fromOneWeekAgo);
  // Test 3: Filter with weekStartDate.lte (only) - should return timesheets up to oneWeekAgo
  const upToOneWeekAgo = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        weekStartDate: {
          lte: oneWeekAgo.toISOString(),
        },
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(upToOneWeekAgo);
  // Test 4: Filter with both gte and lte - should return timesheets within the range
  const withinRange = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        weekStartDate: {
          gte: twoWeeksAgo.toISOString(),
          lte: nextWeek.toISOString(),
        },
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(withinRange);
  // Validate: timesheets in gte-only filter have weekStartDate >= oneWeekAgo
  for (const ts of fromOneWeekAgo.data) {
    const tsDate = new Date(ts.weekStartDate);
    TestValidator.predicate(
      "weekStartDate >= gte filter date",
      tsDate.getTime() >= oneWeekAgo.getTime(),
    );
  }
  // Validate: timesheets in lte-only filter have weekStartDate <= oneWeekAgo
  for (const ts of upToOneWeekAgo.data) {
    const tsDate = new Date(ts.weekStartDate);
    TestValidator.predicate(
      "weekStartDate <= lte filter date",
      tsDate.getTime() <= oneWeekAgo.getTime(),
    );
  }
  // Validate: timesheets in range filter have weekStartDate between twoWeeksAgo and nextWeek (inclusive)
  for (const ts of withinRange.data) {
    const tsDate = new Date(ts.weekStartDate);
    TestValidator.predicate(
      "weekStartDate within range (gte <= date <= lte)",
      tsDate.getTime() >= twoWeeksAgo.getTime() &&
        tsDate.getTime() <= nextWeek.getTime(),
    );
  }
  // Validate: combined range result count should be <= individual filter results
  TestValidator.predicate(
    "combined range filter result count is reasonable",
    withinRange.data.length <= fromOneWeekAgo.data.length,
  );
  TestValidator.predicate(
    "combined range filter result count is reasonable",
    withinRange.data.length <= upToOneWeekAgo.data.length,
  );
}
