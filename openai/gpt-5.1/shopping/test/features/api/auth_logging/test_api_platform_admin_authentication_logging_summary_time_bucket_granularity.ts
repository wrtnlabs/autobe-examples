import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallActorType";
import type { IEShoppingMallAnalyticsGranularity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallAnalyticsGranularity";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallAuthenticationActorTypeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthenticationActorTypeSummary";
import type { IShoppingMallAuthenticationAnomalyIndicator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthenticationAnomalyIndicator";
import type { IShoppingMallAuthenticationFailureReasonSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthenticationFailureReasonSummary";
import type { IShoppingMallAuthenticationLoggingSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthenticationLoggingSummary";
import type { IShoppingMallAuthenticationTimeBucketSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthenticationTimeBucketSummary";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_authentication_logging_summary_time_bucket_granularity(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish authorized session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate several customer password reset requests to create auth log activity
  const resetCountPerBurst = 3;
  const burstEmails: string[] = [];

  for (let i = 0; i < resetCountPerBurst; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    burstEmails.push(email);
    const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email,
          } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
        },
      );
    typia.assert(resetResult);
  }

  // Small artificial delay between bursts to increase chance of different minute buckets
  await new Promise((resolve) => setTimeout(resolve, 1100));

  for (let i = 0; i < resetCountPerBurst; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    burstEmails.push(email);
    const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email,
          } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
        },
      );
    typia.assert(resetResult);
  }

  // 3. Prepare fine-grained (minute) summary request over a window covering generated events
  const now = new Date();
  const startFine = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
  const endFine = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes ahead

  const fineRequestBody = {
    startAt: startFine.toISOString(),
    endAt: endFine.toISOString(),
    granularity: "minute" as IEShoppingMallAnalyticsGranularity,
    actorTypes: undefined,
    regions: undefined,
    ipRanges: undefined,
    maxBuckets: undefined,
  } satisfies IShoppingMallAuthenticationLoggingSummary.IRequest;

  const fineSummary: IShoppingMallAuthenticationLoggingSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.authenticationSummary.index(
      connection,
      {
        body: fineRequestBody,
      },
    );
  typia.assert(fineSummary);

  // 4. Validate fine-grained summary business rules
  TestValidator.equals(
    "fine summary granularity should be minute",
    fineSummary.granularity,
    "minute" as IEShoppingMallAnalyticsGranularity,
  );

  // timeRange should be within or equal to requested bounds
  TestValidator.predicate("timeRange.start within requested window", () => {
    const reqStart = new Date(fineRequestBody.startAt).getTime();
    const reqEnd = new Date(fineRequestBody.endAt).getTime();
    const actualStart = new Date(fineSummary.timeRange.start).getTime();
    const actualEnd = new Date(fineSummary.timeRange.end).getTime();
    return (
      actualStart >= reqStart && actualEnd <= reqEnd && actualStart < actualEnd
    );
  });

  // Validate basic counters are non-negative and consistent
  TestValidator.predicate(
    "fine summary total attempts non-negative",
    fineSummary.totalLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "fine summary successful attempts non-negative",
    fineSummary.successfulLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "fine summary failed attempts non-negative",
    fineSummary.failedLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "fine summary success+fail equals total",
    fineSummary.totalLoginAttempts ===
      fineSummary.successfulLoginAttempts + fineSummary.failedLoginAttempts,
  );

  const timeBuckets = fineSummary.timeBuckets ?? [];

  if (timeBuckets.length > 0) {
    // Buckets should be ordered and non-overlapping, with positive duration
    for (let i = 0; i < timeBuckets.length; i++) {
      const bucket: IShoppingMallAuthenticationTimeBucketSummary =
        timeBuckets[i];
      const start = new Date(bucket.bucketStartAt).getTime();
      const end = new Date(bucket.bucketEndAt).getTime();

      TestValidator.predicate(`bucket ${i} has positive duration`, end > start);

      // each bucket's totals must be consistent and non-negative
      TestValidator.predicate(
        `bucket ${i} total attempts non-negative`,
        bucket.totalLoginAttempts >= 0,
      );
      TestValidator.predicate(
        `bucket ${i} successful attempts non-negative`,
        bucket.successfulLoginAttempts >= 0,
      );
      TestValidator.predicate(
        `bucket ${i} failed attempts non-negative`,
        bucket.failedLoginAttempts >= 0,
      );
      TestValidator.predicate(
        `bucket ${i} success+fail equals total`,
        bucket.totalLoginAttempts ===
          bucket.successfulLoginAttempts + bucket.failedLoginAttempts,
      );

      if (i > 0) {
        const prev = timeBuckets[i - 1];
        const prevEnd = new Date(prev.bucketEndAt).getTime();
        TestValidator.predicate(
          `bucket ${i} start should be >= previous end`,
          start >= prevEnd,
        );
      }
    }
  }

  // 5. Coarser granularity (day) over the same window
  const coarseRequestBody = {
    startAt: fineRequestBody.startAt,
    endAt: fineRequestBody.endAt,
    granularity: "day" as IEShoppingMallAnalyticsGranularity,
    actorTypes: undefined,
    regions: undefined,
    ipRanges: undefined,
    maxBuckets: undefined,
  } satisfies IShoppingMallAuthenticationLoggingSummary.IRequest;

  const coarseSummary: IShoppingMallAuthenticationLoggingSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.authenticationSummary.index(
      connection,
      {
        body: coarseRequestBody,
      },
    );
  typia.assert(coarseSummary);

  TestValidator.equals(
    "coarse summary granularity should be day",
    coarseSummary.granularity,
    "day" as IEShoppingMallAnalyticsGranularity,
  );

  TestValidator.predicate(
    "coarse summary total attempts non-negative",
    coarseSummary.totalLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "coarse summary successful attempts non-negative",
    coarseSummary.successfulLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "coarse summary failed attempts non-negative",
    coarseSummary.failedLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "coarse summary success+fail equals total",
    coarseSummary.totalLoginAttempts ===
      coarseSummary.successfulLoginAttempts + coarseSummary.failedLoginAttempts,
  );

  const coarseBuckets = coarseSummary.timeBuckets ?? [];
  if (coarseBuckets.length > 0) {
    for (let i = 0; i < coarseBuckets.length; i++) {
      const bucket = coarseBuckets[i];
      const start = new Date(bucket.bucketStartAt).getTime();
      const end = new Date(bucket.bucketEndAt).getTime();

      TestValidator.predicate(
        `coarse bucket ${i} has positive duration`,
        end > start,
      );

      TestValidator.predicate(
        `coarse bucket ${i} total attempts non-negative`,
        bucket.totalLoginAttempts >= 0,
      );
      TestValidator.predicate(
        `coarse bucket ${i} successful attempts non-negative`,
        bucket.successfulLoginAttempts >= 0,
      );
      TestValidator.predicate(
        `coarse bucket ${i} failed attempts non-negative`,
        bucket.failedLoginAttempts >= 0,
      );
      TestValidator.predicate(
        `coarse bucket ${i} success+fail equals total`,
        bucket.totalLoginAttempts ===
          bucket.successfulLoginAttempts + bucket.failedLoginAttempts,
      );

      if (i > 0) {
        const prev = coarseBuckets[i - 1];
        const prevEnd = new Date(prev.bucketEndAt).getTime();
        TestValidator.predicate(
          `coarse bucket ${i} start should be >= previous end`,
          start >= prevEnd,
        );
      }
    }
  }
}
