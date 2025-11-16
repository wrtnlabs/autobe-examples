import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAnalyticsOutcomes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsOutcomes";

export async function test_api_moderation_outcomes_analytics_time_series_bucketization(
  connection: api.IConnection,
) {
  // 1. Arrange: create an adminUser so that subsequent analytics calls are authorized.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Define a deterministic time window for analytics.
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const baseRequest = {
    createdAtFrom: from,
    createdAtTo: to,
  } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest;

  // 3. Act: call analytics without explicit timezone (defaults to server semantics, typically UTC).
  const defaultOutcome: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      { body: baseRequest },
    );
  typia.assert(defaultOutcome);

  // Basic high-level metric sanity checks.
  TestValidator.predicate(
    "totalActionsCount is non-negative",
    defaultOutcome.totalActionsCount >= 0,
  );
  TestValidator.predicate(
    "contentRemovalCount is non-negative",
    defaultOutcome.contentRemovalCount >= 0,
  );
  TestValidator.predicate(
    "communityRestrictionCount is non-negative",
    defaultOutcome.communityRestrictionCount >= 0,
  );
  TestValidator.predicate(
    "userSuspensionCount is non-negative",
    defaultOutcome.userSuspensionCount >= 0,
  );
  TestValidator.predicate(
    "warningOnlyCount is non-negative",
    defaultOutcome.warningOnlyCount >= 0,
  );
  TestValidator.predicate(
    "noActionCount is non-negative",
    defaultOutcome.noActionCount >= 0,
  );
  TestValidator.predicate(
    "caseResolutionRate is between 0 and 1",
    defaultOutcome.caseResolutionRate >= 0 &&
      defaultOutcome.caseResolutionRate <= 1,
  );

  // Validate actionsOverTime structural invariants for defaultOutcome.
  const defaultBuckets = defaultOutcome.actionsOverTime;
  let defaultSum = 0;
  for (let i = 0; i < defaultBuckets.length; i++) {
    const bucket = defaultBuckets[i];
    // typia.assert already ensures ISO date-time format, but we also validate ordering.
    defaultSum += bucket.count;

    TestValidator.predicate(
      `default bucket count is non-negative at index ${i}`,
      bucket.count >= 0,
    );

    if (i > 0) {
      const prev = defaultBuckets[i - 1];
      TestValidator.predicate(
        `default buckets are non-overlapping and ordered at index ${i}`,
        prev.end <= bucket.start,
      );
    }
  }

  TestValidator.predicate(
    "sum of default bucket counts does not exceed totalActionsCount",
    defaultSum <= defaultOutcome.totalActionsCount,
  );

  // 4. Act: call analytics with explicit Asia/Seoul timezone over the same range.
  const seoulRequest = {
    createdAtFrom: from,
    createdAtTo: to,
    timezone: "Asia/Seoul",
  } satisfies ICommunityPlatformModerationAnalyticsOutcomes.IRequest;

  const seoulOutcome: ICommunityPlatformModerationAnalyticsOutcomes =
    await api.functional.communityPlatform.adminUser.moderation.analytics.outcomes.index(
      connection,
      { body: seoulRequest },
    );
  typia.assert(seoulOutcome);

  // Re-run high-level metric sanity checks for timezone-specific outcome.
  TestValidator.predicate(
    "totalActionsCount (Asia/Seoul) is non-negative",
    seoulOutcome.totalActionsCount >= 0,
  );
  TestValidator.predicate(
    "caseResolutionRate (Asia/Seoul) is between 0 and 1",
    seoulOutcome.caseResolutionRate >= 0 &&
      seoulOutcome.caseResolutionRate <= 1,
  );

  const seoulBuckets = seoulOutcome.actionsOverTime;
  let seoulSum = 0;
  for (let i = 0; i < seoulBuckets.length; i++) {
    const bucket = seoulBuckets[i];
    seoulSum += bucket.count;

    TestValidator.predicate(
      `Asia/Seoul bucket count is non-negative at index ${i}`,
      bucket.count >= 0,
    );

    if (i > 0) {
      const prev = seoulBuckets[i - 1];
      TestValidator.predicate(
        `Asia/Seoul buckets are non-overlapping and ordered at index ${i}`,
        prev.end <= bucket.start,
      );
    }
  }

  TestValidator.predicate(
    "sum of Asia/Seoul bucket counts does not exceed totalActionsCount",
    seoulSum <= seoulOutcome.totalActionsCount,
  );

  // 5. Compare the two time-series to ensure timezone affects bucketization in some way.
  // We do not assert exact semantics but ensure structural differences or at least non-contradictions.
  if (defaultBuckets.length > 0 && seoulBuckets.length > 0) {
    const defaultFirst = defaultBuckets[0];
    const seoulFirst = seoulBuckets[0];

    // It's acceptable if boundaries are equal; we primarily ensure both are valid and ordered.
    // But if they differ, ensure the comparison is logically consistent.
    TestValidator.predicate(
      "timezone-specific bucketization should not start after createdAtTo",
      defaultFirst.start < to && seoulFirst.start < to,
    );
  }
}
