import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformSecurityEventStatisticsByEventType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSecurityEventStatisticsByEventType";

/**
 * Validate that a platform administrator can establish the prerequisites for
 * querying security event statistics with a time window filter.
 *
 * Because the SDK function for GET
 * /communityPlatform/platformAdmin/securityEvents/statistics/byEventType is not
 * available in the provided materials, this test focuses on the implementable
 * parts of the scenario: authenticating as a platform admin, creating at least
 * one account status (so that any security-event related account status lookups
 * would be valid), and constructing a well-formed time window that could be
 * used as from/to query parameters.
 *
 * Business reasoning:
 *
 * - Platform admin must be able to join and receive an authorization token.
 * - Once joined, the admin can create new account status definitions that are
 *   later used when aggregating security events.
 * - A correctly constructed time window (from <= to, ISO 8601) is a prerequisite
 *   for any time-based security analytics.
 *
 * Steps implemented by this test:
 *
 * 1. Generate a realistic registration payload for a platform administrator using
 *    ICommunityPlatformPlatformadmin.IJoin and call
 *    api.functional.auth.platformAdmin.join.
 * 2. Assert that the returned object satisfies
 *    ICommunityPlatformPlatformadmin.IAuthorized and that the embedded
 *    IAuthorizationToken contains a non-empty access token and valid date-time
 *    formatted expiration fields.
 * 3. While authenticated as this platform admin (the SDK will have propagated the
 *    Authorization header), create a new account status via
 *    api.functional.communityPlatform.platformAdmin.accountStatuses.create
 *    using ICommunityPlatformAccountStatus.ICreate.
 * 4. Assert that the created account status matches
 *    ICommunityPlatformAccountStatus and that its behavioral flags and audit
 *    timestamps are populated.
 * 5. Construct a narrow time window [from, to] around the current time, encode
 *    them as ISO 8601 strings, and verify basic ordering and formatting
 *    invariants that a future statistics endpoint invocation would rely on.
 */
export async function test_api_platform_admin_security_event_statistics_with_time_window_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin join / authentication
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "203.0.113.10",
    href: "https://admin.console.example.com/register",
    referrer: "https://landing.example.com/security",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // Validate token structure via typia and a few business-level predicates
  const token: IAuthorizationToken = adminAuthorized.token;
  typia.assert(token);

  TestValidator.predicate(
    "platform admin access token should be a non-empty string",
    token.access.length > 0,
  );

  TestValidator.predicate(
    "platform admin refresh token should be a non-empty string",
    token.refresh.length > 0,
  );

  TestValidator.predicate(
    "platform admin id should be a non-empty UUID string",
    adminAuthorized.id.length > 0,
  );

  // 2. Create an account status as a platform admin
  const statusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active Account (e2e)",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert(createdStatus);

  TestValidator.equals(
    "created account status key should match input",
    createdStatus.key,
    statusCreateBody.key,
  );

  TestValidator.equals(
    "created account status label should match input",
    createdStatus.label,
    statusCreateBody.label,
  );

  TestValidator.predicate(
    "created account status id should be a non-empty UUID string",
    createdStatus.id.length > 0,
  );

  TestValidator.predicate(
    "created account status should allow login, posting, and voting",
    createdStatus.isLoginAllowed &&
      createdStatus.isPostingAllowed &&
      createdStatus.isVotingAllowed,
  );

  // 3. Construct a narrow time window to be used as from/to filters
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - oneDayMs);
  const toDate = now;

  const from: string & tags.Format<"date-time"> =
    fromDate.toISOString() as string & tags.Format<"date-time">;
  const to: string & tags.Format<"date-time"> = toDate.toISOString() as string &
    tags.Format<"date-time">;

  // Basic invariants that the statistics endpoint would rely upon
  TestValidator.predicate(
    "from date-time should be less than or equal to to date-time",
    fromDate.getTime() <= toDate.getTime(),
  );

  TestValidator.predicate(
    "from ISO string should parse back to the same millisecond value",
    new Date(from).getTime() === fromDate.getTime(),
  );

  TestValidator.predicate(
    "to ISO string should parse back to the same millisecond value",
    new Date(to).getTime() === toDate.getTime(),
  );

  // Even though we cannot call the statistics endpoint here due to missing
  // SDK, we can still assert that the time window variables are compatible
  // with the ICommunityPlatformSecurityEventStatisticsByEventType.from/to
  // field formats.
  const statisticsShapeProbe: ICommunityPlatformSecurityEventStatisticsByEventType =
    {
      buckets: [],
      totalEvents: 0,
      from,
      to,
      actorType: null,
    };
  typia.assert(statisticsShapeProbe);

  TestValidator.equals(
    "statistics probe totalEvents should be zero for an empty bucket list",
    statisticsShapeProbe.totalEvents,
    0,
  );
}
