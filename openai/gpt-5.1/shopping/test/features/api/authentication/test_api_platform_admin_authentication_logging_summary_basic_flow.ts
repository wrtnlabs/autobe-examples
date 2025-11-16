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
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can retrieve an aggregated
 * authentication logging summary covering recent customer authentication
 * activity.
 *
 * Business flow:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join. The SDK
 *    automatically attaches the issued JWT access token to the shared
 *    connection, establishing an authenticated platformAdmin context.
 * 2. As an unauthenticated customer context (by cloning the connection without
 *    headers), send several password reset requests using
 *    /auth/customer/password/reset/request with different realistic email
 *    addresses. These calls conceptually generate auth log entries like
 *    password_reset_request for actorType "customer".
 * 3. Still in the customer context, invoke /auth/customer/password/reset once with
 *    a plausible opaque token and new password, simulating a
 *    password_reset_success flow. In simulator mode typia-based mocks will
 *    accept random payloads; in real environments the token must be valid, but
 *    the test focuses on the downstream analytics summary rather than specific
 *    token lifecycle details.
 * 4. Compute an analysis window around the current time (for example, from 15
 *    minutes ago until 15 minutes in the future) and build an
 *    IShoppingMallAuthenticationLoggingSummary.IRequest body with:
 *
 *    - StartAt/endAt covering the period where the synthetic events were created,
 *    - Granularity set to "hour",
 *    - No actorTypes/regions/ipRanges filters so that all activity is included,
 *    - A small maxBuckets guard (e.g., 24).
 * 5. Using the original admin-authenticated connection, call PATCH
 *    /shoppingMall/platformAdmin/analytics/logging/authenticationSummary
 *    through
 *    api.functional.shoppingMall.platformAdmin.analytics.logging.authenticationSummary.index.
 * 6. Assert that the response conforms to
 *    IShoppingMallAuthenticationLoggingSummary via typia.assert, then perform
 *    business-level validations:
 *
 *    - TotalLoginAttempts, successfulLoginAttempts, failedLoginAttempts and
 *         uniqueActors are all >= 0,
 *    - When present, failureReasons, actorTypeBreakdown, timeBuckets and
 *         anomalyIndicators are arrays,
 *    - If actorTypeBreakdown contains an entry for actorType === "customer", that
 *         entry's counts are all non-negative.
 */
export async function test_api_platform_admin_authentication_logging_summary_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and rely on SDK to attach Authorization
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shopping-mall.test/console" as string &
      tags.Format<"uri">,
    referrer: "https://shopping-mall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare an unauthenticated customer connection for password reset flows
  const customerConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Generate multiple password reset requests with realistic emails
  const customerEmails: (string & tags.Format<"email">)[] = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
    adminEmail, // mix in an email that may or may not correspond to any customer
  ];

  await ArrayUtil.asyncForEach(customerEmails, async (email, index) => {
    const requestBody = {
      email,
    } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

    const resetRequestResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        customerConn,
        {
          body: requestBody,
        },
      );
    typia.assert(resetRequestResult);

    TestValidator.predicate(
      `password reset request status is accepted/processed [${index}]`,
      resetRequestResult.status === "accepted" ||
        resetRequestResult.status === "processed",
    );
  });

  // 3. Simulate a password reset completion for a customer
  const resetPasswordBody = {
    token: RandomGenerator.alphaNumeric(32),
    password: RandomGenerator.alphaNumeric(18),
  } satisfies IShoppingMallCustomerAuth.IResetPassword;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.reset.resetPassword(
      customerConn,
      {
        body: resetPasswordBody,
      },
    );
  typia.assert(customerAuthorized);

  // 4. Build analytics request covering the recent activity window
  const now = new Date();
  const start = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

  const analyticsRequestBody = {
    startAt: start as string & tags.Format<"date-time">,
    endAt: end as string & tags.Format<"date-time">,
    granularity: "hour" as IEShoppingMallAnalyticsGranularity,
    actorTypes: undefined,
    regions: undefined,
    ipRanges: undefined,
    maxBuckets: 24 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAuthenticationLoggingSummary.IRequest;

  // 5. Call authentication summary endpoint as platform admin (connection already authenticated)
  const summary: IShoppingMallAuthenticationLoggingSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.authenticationSummary.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(summary);

  // 6. Business-level validations on the summary
  TestValidator.predicate(
    "totalLoginAttempts is non-negative",
    summary.totalLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "successfulLoginAttempts is non-negative",
    summary.successfulLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "failedLoginAttempts is non-negative",
    summary.failedLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "uniqueActors is non-negative",
    summary.uniqueActors >= 0,
  );

  if (summary.failureReasons !== undefined) {
    TestValidator.predicate(
      "failureReasons is an array when defined",
      Array.isArray(summary.failureReasons),
    );
  }
  if (summary.actorTypeBreakdown !== undefined) {
    TestValidator.predicate(
      "actorTypeBreakdown is an array when defined",
      Array.isArray(summary.actorTypeBreakdown),
    );

    const customerBucket = summary.actorTypeBreakdown.find(
      (bucket) => bucket.actorType === "customer",
    );

    if (customerBucket !== undefined) {
      TestValidator.predicate(
        "customer actorType totalAttempts is non-negative",
        customerBucket.totalAttempts >= 0,
      );
      TestValidator.predicate(
        "customer actorType successfulAttempts is non-negative",
        customerBucket.successfulAttempts >= 0,
      );
      TestValidator.predicate(
        "customer actorType failedAttempts is non-negative",
        customerBucket.failedAttempts >= 0,
      );
    }
  }

  if (summary.timeBuckets !== undefined) {
    TestValidator.predicate(
      "timeBuckets is an array when defined",
      Array.isArray(summary.timeBuckets),
    );
  }

  if (summary.anomalyIndicators !== undefined) {
    TestValidator.predicate(
      "anomalyIndicators is an array when defined",
      Array.isArray(summary.anomalyIndicators),
    );
  }
}
