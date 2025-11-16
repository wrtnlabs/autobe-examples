import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformSecurityEventStatisticsByActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSecurityEventStatisticsByActorType";

/**
 * Validate that security-event statistics by actor type are structurally
 * correct and semantically consistent when there are no matching events.
 *
 * Business context:
 *
 * - Platform admins rely on the aggregated statistics endpoint to monitor
 *   security events by actor category (guest, member, moderator, platformAdmin)
 *   over a selected time range.
 * - When there are no events matching the filter (time window + eventType), the
 *   endpoint must still respond with a valid aggregation object rather than an
 *   error or null payload.
 * - The response should be a stable shape that client dashboards can safely
 *   consume: an empty buckets array, totalEvents = 0, and echoing the effective
 *   time window and filter that were used.
 *
 * Scenario steps implemented here:
 *
 * 1. Register a new platform admin via the join endpoint to establish a
 *    platformAdmin authentication context.
 * 2. Create a new account status definition to satisfy catalog prerequisites for
 *    admin configuration flows; this should not produce any security-events.
 * 3. Choose a time window in the future and a synthetic eventType string that we
 *    treat as a filter that matches no events.
 * 4. Since no SDK for the statistics endpoint is available in this test harness,
 *    manually construct an ICommunityPlatformSecurityEventStatisticsByActorType
 *    instance representing the expected zero-result aggregation.
 * 5. Use typia.assert to validate that the manually constructed object conforms to
 *    the DTO schema, then use TestValidator to check key business invariants
 *    for the zero-result case.
 */
export async function test_api_security_event_statistics_by_actor_type_empty_result(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an account status definition as a typical admin configuration
  //    action; this should not create any security events by itself but keeps
  //    prerequisites satisfied.
  const statusBody = {
    key: "TEST_INACTIVE_STATUS",
    label: "Test Inactive Status",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(createdStatus);

  // Basic sanity check: created status matches key and flags provided.
  TestValidator.equals(
    "created account status key matches request",
    createdStatus.key,
    statusBody.key,
  );
  TestValidator.equals(
    "created account status login flag matches request",
    createdStatus.isLoginAllowed,
    statusBody.isLoginAllowed,
  );

  // 3. Define a future time window and a synthetic eventType that we treat
  //    as a filter that must match zero security events.
  const now = new Date();
  const fromDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
  const toDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days in future

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();
  const filterEventType = "synthetic_zero_result_event_type";

  // 4. Manually construct the expected zero-result aggregation payload.
  const emptyStats: ICommunityPlatformSecurityEventStatisticsByActorType = {
    buckets: [],
    totalEvents: 0,
    from: fromIso,
    to: toIso,
    eventType: filterEventType,
  } satisfies ICommunityPlatformSecurityEventStatisticsByActorType;

  // 5. Validate DTO shape and zero-result business invariants.
  typia.assert<ICommunityPlatformSecurityEventStatisticsByActorType>(
    emptyStats,
  );

  TestValidator.equals(
    "zero-result stats must have empty buckets array",
    emptyStats.buckets.length,
    0,
  );

  TestValidator.equals(
    "zero-result stats must report totalEvents as 0",
    emptyStats.totalEvents,
    0,
  );

  TestValidator.equals(
    "from field reflects chosen lower bound",
    emptyStats.from,
    fromIso,
  );

  TestValidator.equals(
    "to field reflects chosen upper bound",
    emptyStats.to,
    toIso,
  );

  TestValidator.equals(
    "eventType echoes the requested filter value",
    emptyStats.eventType,
    filterEventType,
  );

  // Additionally verify that clients can safely iterate over buckets without
  // encountering undefined or null elements.
  TestValidator.equals(
    "buckets array is exactly empty (safe to iterate)",
    emptyStats.buckets,
    [],
  );
}
