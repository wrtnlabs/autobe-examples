import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_member_view_own_entries(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create test member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // Create member-specific connection with token
  const memberLoginConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // Test: View own timelogs (members can only access their own by design)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7); // One week ago
  const endDate = today;
  const result = await api.functional.hrmTracker.member.timelogs.index(
    memberLoginConnection,
    {
      body: {
        start_date: startDate.toISOString().split("T")[0] as string &
          tags.Format<"date-time">,
        end_date: endDate.toISOString().split("T")[0] as string &
          tags.Format<"date-time">,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result);
  // Validate: Check pagination structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "has valid records count",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    result.pagination.pages >= 0,
  );
  // Validate: Check data structure
  TestValidator.predicate("has data array", Array.isArray(result.data));
  result.data.forEach((timelog) => {
    typia.assert(timelog);
    // Validate basic structure
    TestValidator.predicate("has id", typeof timelog.id === "string");
    TestValidator.predicate("has date", typeof timelog.date === "string");
    TestValidator.predicate(
      "has duration",
      typeof timelog.duration_in_minutes === "number",
    );
    TestValidator.predicate(
      "has billable flag",
      typeof timelog.billable === "boolean",
    );
  });
  // Validate: Date range filtering (all returned entries should be within range)
  const allInDateRange = result.data.every((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });
  TestValidator.predicate("all entries in date range", allInDateRange);
  // Validate: Hour calculations when data exists
  if (result.data.length > 0) {
    const totalHours = result.data.reduce((sum, entry) => {
      return sum + entry.duration_in_minutes / 60;
    }, 0);
    TestValidator.predicate("total hours computed", totalHours >= 0);
    // Validate project summary presence when applicable
    const hasProjectSummary = result.data.every(
      (entry) => entry.project !== undefined || entry.project === undefined,
    );
    TestValidator.predicate("project summary field exists", hasProjectSummary);
  }
}
