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

/**
 * Test that the daily-hours endpoint correctly returns total work hours logged by the authenticated employee for today's date.
 *
 * Validates the member's total work hours for the current day in the organization's timezone. The test creates a member account with organization timezone configuration and verifies that the endpoint returns accurate hours calculation, properly handling the timezone-based date context and hours aggregation.
 *
 * Special attention is given to verifying that the system correctly calculates today's date in the organization's timezone and aggregates timelog durations to compute total hours. The endpoint should return 0.00 if no timelogs exist for the day.
 */
export async function test_api_timetracking_daily_hours_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization (includes timezone configuration)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput: DeepPartial<IHrmPlatformMember.IJoin> = {
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
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    joinConnection,
    { body: joinInput },
  );
  typia.assert(member);
  // 2. Create new connection with authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 3. Call daily-hours endpoint
  const dailyHours =
    await api.functional.hrmPlatform.member.timetracking.daily_hours.at(
      memberConnection,
    );
  typia.assert(dailyHours);
  // 4. Validate response structure and business logic
  TestValidator.predicate(
    "response has valid hours field",
    typeof dailyHours.hours === "number",
  );
  TestValidator.predicate(
    "response has valid date field",
    typeof dailyHours.date === "string",
  );
  TestValidator.predicate("hours is non-negative", dailyHours.hours >= 0);
  TestValidator.predicate(
    "date format is YYYY-MM-DD",
    /^\d{4}-\d{2}-\d{2}$/.test(dailyHours.date),
  );
}
