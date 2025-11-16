import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverview";
import type { IShoppingMallActorSecurityOverviewActorSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverviewActorSegment";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_security_overview_with_real_actor_data(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to create a real admin actor and session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // Provide realistic context URLs
    ip: null,
    href: "https://admin.shoppingmall.local/onboarding" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // Basic sanity checks on the issued token structure
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a guest user so that there is at least one persisted guest identity
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(guestUser);

  // 3. Call the security overview endpoint
  const overview1: IShoppingMallActorSecurityOverview =
    await api.functional.shoppingMall.platformAdmin.actors.securityOverview.at(
      connection,
    );
  typia.assert<IShoppingMallActorSecurityOverview>(overview1);

  // Validate that each actor segment exists and has non-negative metrics
  const { customer, seller, platformAdmin } = overview1;
  typia.assert<IShoppingMallActorSecurityOverviewActorSegment>(customer);
  typia.assert<IShoppingMallActorSecurityOverviewActorSegment>(seller);
  typia.assert<IShoppingMallActorSecurityOverviewActorSegment>(platformAdmin);

  // Helper to assert non-negative metrics on a segment
  const assertNonNegativeSegment = (
    title: string,
    segment: IShoppingMallActorSecurityOverviewActorSegment,
  ): void => {
    TestValidator.predicate(
      `${title}: totalActors is non-negative`,
      segment.totalActors >= 0,
    );
    TestValidator.predicate(
      `${title}: activeSessions is non-negative`,
      segment.activeSessions >= 0,
    );
    TestValidator.predicate(
      `${title}: recentSessions is non-negative`,
      segment.recentSessions >= 0,
    );
    TestValidator.predicate(
      `${title}: failedLoginAttempts is non-negative`,
      segment.failedLoginAttempts >= 0,
    );
    TestValidator.predicate(
      `${title}: successfulLogins is non-negative`,
      segment.successfulLogins >= 0,
    );
    TestValidator.predicate(
      `${title}: lockedAccounts is non-negative`,
      segment.lockedAccounts >= 0,
    );
    TestValidator.predicate(
      `${title}: mfaChallenges is non-negative`,
      segment.mfaChallenges >= 0,
    );
  };

  assertNonNegativeSegment("customer", customer);
  assertNonNegativeSegment("seller", seller);
  assertNonNegativeSegment("platformAdmin", platformAdmin);

  // time window should be a positive integer
  TestValidator.predicate(
    "timeWindowMinutes must be positive",
    overview1.timeWindowMinutes > 0,
  );

  // We have just created a platform admin; there should be at least 1 platformAdmin actor
  TestValidator.predicate(
    "platformAdmin.totalActors should be at least 1",
    platformAdmin.totalActors >= 1,
  );

  // 4. Re-call the endpoint to ensure read-only/idempotent behavior for high-level metrics
  const overview2: IShoppingMallActorSecurityOverview =
    await api.functional.shoppingMall.platformAdmin.actors.securityOverview.at(
      connection,
    );
  typia.assert<IShoppingMallActorSecurityOverview>(overview2);

  // Compare high-level structures for equality; minor timing differences
  // in underlying data should not change the shape of the response.
  TestValidator.equals(
    "securityOverview.customer segment is stable across repeated reads",
    overview1.customer,
    overview2.customer,
  );
  TestValidator.equals(
    "securityOverview.seller segment is stable across repeated reads",
    overview1.seller,
    overview2.seller,
  );
  TestValidator.equals(
    "securityOverview.platformAdmin segment is stable across repeated reads",
    overview1.platformAdmin,
    overview2.platformAdmin,
  );
  TestValidator.equals(
    "securityOverview.timeWindowMinutes is stable across repeated reads",
    overview1.timeWindowMinutes,
    overview2.timeWindowMinutes,
  );
}
