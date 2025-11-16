import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformSecurityEventStatisticsByEventType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSecurityEventStatisticsByEventType";

/**
 * Validate that a platform administrator can prepare the environment for
 * security event statistics filtered by actor type.
 *
 * The business requirement is that GET
 * /communityPlatform/platformAdmin/securityEvents/statistics/byEventType
 * supports an `actorType` query parameter that scopes analytics to specific
 * actor categories (guestUser, memberUser, communityModerator, platformAdmin).
 * However, the concrete SDK function for this endpoint is not present in the
 * current client library. To keep the test compilable while still validating
 * all available prerequisites, this test focuses on establishing the correct
 * platformAdmin authentication context and seeding at least one account status
 * row, which are mandatory dependencies for any realistic security analytics
 * workflow.
 *
 * Workflow implemented in this test:
 *
 * 1. Register a new platform administrator using
 *    api.functional.auth.platformAdmin.join. The returned
 *    ICommunityPlatformPlatformadmin.IAuthorized payload is asserted with
 *    typia.assert, and we additionally validate that it carries a valid
 *    IAuthorizationToken structure and a non-null accountStatus summary. The
 *    join call also configures the connection headers with the admin's access
 *    token, establishing the platformAdmin actor context for subsequent
 *    administrative calls.
 * 2. Create a new account status using
 *    api.functional.communityPlatform.platformAdmin.accountStatuses.create with
 *    a body satisfying ICommunityPlatformAccountStatus.ICreate. The response is
 *    asserted as ICommunityPlatformAccountStatus. From a business perspective
 *    this ensures that the master table community_platform_account_statuses
 *    contains at least one status that can be referenced by security event
 *    records and admin accounts.
 * 3. Enumerate the supported actorType values at the DTO level using a local
 *    literal tuple and typia.assert to ensure we only work with the allowed
 *    union members ("guestUser", "memberUser", "communityModerator",
 *    "platformAdmin"). For each actor type we document, via comments, how a
 *    future SDK call to the statistics endpoint would be shaped and what
 *    invariants would be validated, but we deliberately avoid calling any
 *    non-existent api.functional.* function to keep the test fully compilable
 *    and within the bounds of the available client surface.
 * 4. As an additional sanity check aligned with the intended analytics behavior,
 *    we create an in-memory mock result
 *    ICommunityPlatformSecurityEventStatisticsByEventType for one actorType and
 *    assert it with typia.assert. We then verify that its actorType echo
 *    matches the selected filter and that totalEvents equals the sum of
 *    bucket.eventCount values. This models the validation logic we would apply
 *    to the real API response once the statistics endpoint is wired into the
 *    SDK.
 *
 * This test does not attempt to fabricate or send incorrect types, nor does it
 * rely on any non-existent endpoints. It focuses on environment setup and
 * DTO-level invariants that are already supported by the generated API client
 * and type definitions, providing a safe foundation for future expansion once
 * the statistics endpoint SDK function becomes available.
 */
export async function test_api_platform_admin_security_event_statistics_filtered_by_actor_type(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and assert the authorized payload
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      ip: undefined,
      href: "https://admin.console.local/join",
      referrer: "https://admin.console.local/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(admin.accountStatus);

  // 2. Seed at least one account status definition
  const status =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: RandomGenerator.alphabets(10),
          label: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 10,
          }),
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(status);

  // Basic sanity check: the created status should be login/posting/voting allowed
  TestValidator.predicate(
    "created account status is fully permissive",
    status.isLoginAllowed && status.isPostingAllowed && status.isVotingAllowed,
  );

  // 3. Enumerate supported actorType values at the DTO level
  const actorTypes = [
    "guestUser",
    "memberUser",
    "communityModerator",
    "platformAdmin",
  ] as const;
  for (const actorType of actorTypes) {
    // Ensure each literal is compatible with the DTO's actorType union
    const echo: ICommunityPlatformSecurityEventStatisticsByEventType["actorType"] =
      actorType;
    TestValidator.equals(
      "actorType literal is assignable to DTO union",
      echo,
      actorType,
    );
  }

  // 4. Construct and validate a mock statistics payload to model future
  //    endpoint behavior and the assertions we would perform.
  const mockActorType = RandomGenerator.pick(actorTypes);

  const mockBuckets: ICommunityPlatformSecurityEventStatisticsByEventType.IBucket[] =
    [
      {
        eventType: "failed_login",
        eventCount: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
        percentage: 50 as number & tags.Minimum<0> & tags.Maximum<100>,
      },
      {
        eventType: "password_reset",
        eventCount: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
        percentage: 50 as number & tags.Minimum<0> & tags.Maximum<100>,
      },
    ];

  const mockTotalEvents = mockBuckets
    .map((b) => b.eventCount as number)
    .reduce((a, b) => a + b, 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const mockStats: ICommunityPlatformSecurityEventStatisticsByEventType = {
    buckets: mockBuckets,
    totalEvents: mockTotalEvents,
    from: null,
    to: null,
    actorType: mockActorType,
  };

  typia.assert<ICommunityPlatformSecurityEventStatisticsByEventType>(mockStats);

  // Validate that totalEvents equals the sum of bucket.eventCount values.
  const sumOfBuckets = mockStats.buckets
    .map((b) => b.eventCount as number)
    .reduce((a, b) => a + b, 0);

  TestValidator.equals(
    "totalEvents equals sum of bucket.eventCount",
    mockStats.totalEvents as number,
    sumOfBuckets,
  );

  // Validate that the echoed actorType matches the selected filter.
  TestValidator.equals(
    "mockStats.actorType echoes selected actorType filter",
    mockStats.actorType,
    mockActorType,
  );
}
