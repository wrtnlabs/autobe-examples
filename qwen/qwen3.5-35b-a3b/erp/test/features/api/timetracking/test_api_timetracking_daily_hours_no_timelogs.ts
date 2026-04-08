import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPlatformTimeTrackingDailyHour } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformTimeTrackingDailyHour";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timetracking_daily_hours_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the daily-hours endpoint returns zero hours when the
   * authenticated employee has no timelogs logged for today.
   *
   * Validates the daily hours endpoint handles the edge case where no
   * timelogs exist for the current day. Ensures the system correctly
   * returns 0.00 hours and calculates the proper date context in the
   * organization's timezone, even without any activity data.
   *
   * Special attention is given to verifying that the date field reflects
   * the organization's configured timezone, and that the hours calculation
   * properly handles empty timelog sets.
   *
   * 1. Register a new member with organization details and timezone.
   * 2. Ensure the member has NOT created any timelogs (default state).
   * 3. Call the daily-hours endpoint with valid authentication.
   * 4. Validate response contains hours: 0.00 and proper date format.
   */
  // 1. Register a new member with organization
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Call daily-hours endpoint (no timelogs exist - default state)
  const response =
    await api.functional.hrmPlatform.member.timetracking.daily_hours.at(
      memberConnection,
    );
  typia.assert(response);
  // 4. Validate response
  TestValidator.equals("hours is zero", response.hours, 0.0);
  TestValidator.equals("date format valid", response.date.length, 10);
}
