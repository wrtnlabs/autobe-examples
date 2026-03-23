import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_analytics_member_view_own_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as regular member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate 7-day date range for analytics
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 6);
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  // 3. Call analytics endpoint with own member context and date filters
  const analytics = await api.functional.hrmTracker.member.timelogs.analytics(
    memberConnection,
    {
      body: {
        start_date: startISO,
        end_date: endISO,
      } satisfies IHrmTrackerTimelog.IRequest,
    },
  );
  typia.assert(analytics);
  // 4. Validate analytics response structure and basic properties
  TestValidator.predicate("has valid hours", analytics.hours !== undefined);
  TestValidator.predicate(
    "has valid billable hours",
    analytics.billable_hours !== undefined,
  );
  TestValidator.predicate(
    "has valid non-billable hours",
    analytics.non_billable_hours !== undefined,
  );
  // 5. Verify dates are in the requested range
  TestValidator.predicate(
    "hours are non-negative",
    () => (analytics.hours ?? 0) >= 0,
  );
  TestValidator.predicate(
    "billable hours are non-negative",
    () => (analytics.billable_hours ?? 0) >= 0,
  );
  TestValidator.predicate(
    "non-billable hours are non-negative",
    () => (analytics.non_billable_hours ?? 0) >= 0,
  );
  // 6. Verify consistency: total = billable + non-billable
  TestValidator.predicate("hours consistency", () => {
    const total = analytics.hours ?? 0;
    const billable = analytics.billable_hours ?? 0;
    const nonBillable = analytics.non_billable_hours ?? 0;
    return Math.abs(total - (billable + nonBillable)) < 0.01; // floating point tolerance
  });
}
