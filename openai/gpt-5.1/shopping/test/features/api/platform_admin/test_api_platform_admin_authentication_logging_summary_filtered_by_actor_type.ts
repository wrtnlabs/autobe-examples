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

export async function test_api_platform_admin_authentication_logging_summary_filtered_by_actor_type(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin so we can call the analytics endpoint.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate customer-related authentication activity via password reset flows.
  // We will request password reset for multiple distinct emails and then
  // complete reset for one of them.
  const customerEmails: (string & tags.Format<"email">)[] = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];

  await ArrayUtil.asyncForEach(customerEmails, async (email) => {
    const requestBody = {
      email,
    } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

    const resetRequestResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(resetRequestResult);
  });

  // For one of those emails, complete a password reset.
  const resetToken: string = RandomGenerator.alphaNumeric(32);
  const newPassword: string = RandomGenerator.alphaNumeric(16);

  const resetPasswordBody = {
    token: resetToken,
    password: newPassword,
  } satisfies IShoppingMallCustomerAuth.IResetPassword;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: resetPasswordBody,
      },
    );
  typia.assert(customerAuthorized);

  // 3. Prepare time range and analytics request bodies.
  // We use arbitrary but valid ISO strings with startAt < endAt.
  const now: Date = new Date();
  const startDate: Date = new Date(now.getTime() - 60 * 60 * 1000); // one hour ago
  const endDate: Date = new Date(now.getTime() + 60 * 60 * 1000); // one hour later

  const startAt: string & tags.Format<"date-time"> =
    startDate.toISOString() as string & tags.Format<"date-time">;
  const endAt: string & tags.Format<"date-time"> =
    endDate.toISOString() as string & tags.Format<"date-time">;

  const granularity: IEShoppingMallAnalyticsGranularity = "hour";

  const filteredRequestBody = {
    startAt,
    endAt,
    granularity,
    actorTypes: ["customer" satisfies IEShoppingMallActorType],
    regions: undefined,
    ipRanges: undefined,
    maxBuckets: undefined,
  } satisfies IShoppingMallAuthenticationLoggingSummary.IRequest;

  // 4. Call analytics summary with actorTypes filter set to ["customer"].
  const filteredSummary: IShoppingMallAuthenticationLoggingSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.authenticationSummary.index(
      connection,
      {
        body: filteredRequestBody,
      },
    );
  typia.assert(filteredSummary);

  // Basic invariants on the filtered summary.
  TestValidator.equals(
    "filtered granularity should match requested value or be omitted",
    filteredSummary.granularity,
    filteredRequestBody.granularity,
  );

  TestValidator.predicate(
    "filtered total login attempts should be non-negative",
    filteredSummary.totalLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "filtered successful login attempts should be non-negative",
    filteredSummary.successfulLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "filtered failed login attempts should be non-negative",
    filteredSummary.failedLoginAttempts >= 0,
  );

  TestValidator.equals(
    "filtered total attempts should equal success + failure",
    filteredSummary.totalLoginAttempts,
    (filteredSummary.successfulLoginAttempts +
      filteredSummary.failedLoginAttempts) as number & tags.Type<"int32">,
  );

  // Actor type breakdown must only contain customer or be undefined/empty.
  if (filteredSummary.actorTypeBreakdown !== undefined) {
    filteredSummary.actorTypeBreakdown.forEach(
      (summary: IShoppingMallAuthenticationActorTypeSummary) => {
        TestValidator.equals(
          "actorTypeBreakdown in filtered summary must only contain customer",
          summary.actorType,
          "customer" satisfies IEShoppingMallActorType,
        );

        TestValidator.predicate(
          "actorType summary totalAttempts should be non-negative",
          summary.totalAttempts >= 0,
        );
        TestValidator.predicate(
          "actorType summary successfulAttempts should be non-negative",
          summary.successfulAttempts >= 0,
        );
        TestValidator.predicate(
          "actorType summary failedAttempts should be non-negative",
          summary.failedAttempts >= 0,
        );

        TestValidator.equals(
          "actorType totals should match success + failure",
          summary.totalAttempts,
          (summary.successfulAttempts + summary.failedAttempts) as number &
            tags.Type<"int32">,
        );
      },
    );
  }

  // Time bucket consistency: per bucket totals and non-negativity.
  if (filteredSummary.timeBuckets !== undefined) {
    filteredSummary.timeBuckets.forEach(
      (bucket: IShoppingMallAuthenticationTimeBucketSummary) => {
        TestValidator.predicate(
          "time bucket totalLoginAttempts should be non-negative",
          bucket.totalLoginAttempts >= 0,
        );
        TestValidator.predicate(
          "time bucket successfulLoginAttempts should be non-negative",
          bucket.successfulLoginAttempts >= 0,
        );
        TestValidator.predicate(
          "time bucket failedLoginAttempts should be non-negative",
          bucket.failedLoginAttempts >= 0,
        );

        TestValidator.equals(
          "time bucket totals should match success + failure",
          bucket.totalLoginAttempts,
          (bucket.successfulLoginAttempts +
            bucket.failedLoginAttempts) as number & tags.Type<"int32">,
        );
      },
    );
  }

  // 5. Comparative call without actorTypes filter to validate filter behavior.
  const unfilteredRequestBody = {
    startAt,
    endAt,
    granularity,
    actorTypes: undefined,
    regions: undefined,
    ipRanges: undefined,
    maxBuckets: undefined,
  } satisfies IShoppingMallAuthenticationLoggingSummary.IRequest;

  const unfilteredSummary: IShoppingMallAuthenticationLoggingSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.authenticationSummary.index(
      connection,
      {
        body: unfilteredRequestBody,
      },
    );
  typia.assert(unfilteredSummary);

  // Unfiltered totals should be at least as large as filtered totals.
  TestValidator.predicate(
    "unfiltered total attempts should be >= filtered total attempts",
    unfilteredSummary.totalLoginAttempts >= filteredSummary.totalLoginAttempts,
  );

  TestValidator.predicate(
    "unfiltered failed attempts should be >= filtered failed attempts",
    unfilteredSummary.failedLoginAttempts >=
      filteredSummary.failedLoginAttempts,
  );

  // If both have actorTypeBreakdown, then the unfiltered set of actor types
  // should be a superset, and the customer counts should be >= filtered.
  if (
    filteredSummary.actorTypeBreakdown !== undefined &&
    unfilteredSummary.actorTypeBreakdown !== undefined
  ) {
    const findCustomerSummary = (
      list: IShoppingMallAuthenticationActorTypeSummary[],
    ): IShoppingMallAuthenticationActorTypeSummary | undefined =>
      list.find((s) => s.actorType === ("customer" as IEShoppingMallActorType));

    const filteredCustomer = findCustomerSummary(
      filteredSummary.actorTypeBreakdown,
    );
    const unfilteredCustomer = findCustomerSummary(
      unfilteredSummary.actorTypeBreakdown,
    );

    if (filteredCustomer !== undefined && unfilteredCustomer !== undefined) {
      TestValidator.predicate(
        "unfiltered customer totalAttempts should be >= filtered",
        unfilteredCustomer.totalAttempts >= filteredCustomer.totalAttempts,
      );
      TestValidator.predicate(
        "unfiltered customer failedAttempts should be >= filtered",
        unfilteredCustomer.failedAttempts >= filteredCustomer.failedAttempts,
      );
    }

    // Ensure that unfiltered actor types include at least the same set
    // as filtered actor types.
    const filteredActorTypes = filteredSummary.actorTypeBreakdown.map(
      (s) => s.actorType,
    );
    const unfilteredActorTypes = unfilteredSummary.actorTypeBreakdown.map(
      (s) => s.actorType,
    );

    filteredActorTypes.forEach((actorType) => {
      TestValidator.predicate(
        "unfiltered actorTypeBreakdown should include all filtered actorTypes",
        unfilteredActorTypes.includes(actorType),
      );
    });
  }
}
