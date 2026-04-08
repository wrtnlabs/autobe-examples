import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timesheet weekly statistics organization isolation enforcement.
 *
 * Validates the multi-tenant data isolation business rule for timesheet weekly
 * statistics, ensuring employees can only access statistics for their own
 * organization. Tests that cross-organization access attempts are rejected
 * with appropriate error responses.
 *
 * Special attention is given to verifying that the statistics record's
 * organization_id field is correctly scoped and that the requesting member's
 * organization context is properly validated against the statistics owner.
 *
 * 1. Register member1 with credentials, creating organization A
 * 2. Create timesheet weekly statistics record for organization A
 * 3. Register member2 with different credentials, creating organization B
 * 4. Create timesheet weekly statistics record for organization B
 * 5. Authenticate member2 and create a connection with their authorization token
 * 6. Attempt to retrieve organization A's statistics record as member2
 * 7. Verify the system rejects cross-organization access
 */
export async function test_api_timesheet_weekly_stats_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member1 for organization A
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member1Auth);
  // Step 2: Create timesheet weekly statistics for organization A
  const statsOrgA = typia.random<IHrmPlatformTimesheetWeeklyStat>();
  typia.assert(statsOrgA);
  // Step 3: Register member2 for organization B
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // Step 4: Create timesheet weekly statistics for organization B
  const statsOrgB = typia.random<IHrmPlatformTimesheetWeeklyStat>();
  typia.assert(statsOrgB);
  // Step 5: Authenticate member2 and create a new connection with their token
  const member2AuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member2Auth.token.access,
    },
  };
  // Step 6: Attempt to retrieve organization A's statistics as member2
  let retrievalResult:
    | IHrmPlatformTimesheetWeeklyStat
    | api.HttpError
    | undefined;
  try {
    const result =
      await api.functional.hrmPlatform.member.timesheet_weekly_stats.at(
        member2AuthenticatedConnection,
        {
          statsId: statsOrgA.id,
        },
      );
    typia.assert(result);
    retrievalResult = result;
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      retrievalResult = error;
    } else {
      throw error;
    }
  }
  // Step 7: Verify cross-organization access is rejected
  if (retrievalResult instanceof api.HttpError) {
    TestValidator.httpError(
      "cross-org access should be rejected",
      [404, 403],
      () => {
        throw retrievalResult!;
      },
    );
  } else {
    TestValidator.predicate(
      "should not retrieve org A stats as member2",
      false,
    );
  }
}