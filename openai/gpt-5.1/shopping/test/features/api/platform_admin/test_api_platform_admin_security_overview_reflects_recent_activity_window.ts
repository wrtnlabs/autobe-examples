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
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_security_overview_reflects_recent_activity_window(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(16);
  const joinBody = {
    email,
    name: RandomGenerator.name(),
    password,
    // realistic URIs for href/referrer
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Perform an additional successful login for same admin
  const loginBody = {
    email,
    password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loggedInAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "login should be for same platform admin id",
    loggedInAdmin.id,
    joinedAdmin.id,
  );

  // 3. Optionally create a guest user to exercise cross-actor security context
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guestUser);

  // 4. Call security overview as platform admin
  const overview: IShoppingMallActorSecurityOverview =
    await api.functional.shoppingMall.platformAdmin.actors.securityOverview.at(
      connection,
    );
  typia.assert(overview);

  // Basic sanity checks on time window
  TestValidator.predicate(
    "timeWindowMinutes must be positive int32",
    overview.timeWindowMinutes >= 1,
  );

  const platformAdminSegment: IShoppingMallActorSecurityOverviewActorSegment =
    overview.platformAdmin;
  typia.assert(platformAdminSegment);

  const {
    totalActors,
    activeSessions,
    recentSessions,
    failedLoginAttempts,
    successfulLogins,
    lockedAccounts,
    mfaChallenges,
  } = platformAdminSegment;

  // All counters must be non-negative
  TestValidator.predicate(
    "platformAdmin.totalActors must be non-negative",
    totalActors >= 0,
  );
  TestValidator.predicate(
    "platformAdmin.activeSessions must be non-negative",
    activeSessions >= 0,
  );
  TestValidator.predicate(
    "platformAdmin.recentSessions must be non-negative",
    recentSessions >= 0,
  );
  TestValidator.predicate(
    "platformAdmin.failedLoginAttempts must be non-negative",
    failedLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "platformAdmin.successfulLogins must be non-negative",
    successfulLogins >= 0,
  );
  TestValidator.predicate(
    "platformAdmin.lockedAccounts must be non-negative",
    lockedAccounts >= 0,
  );
  TestValidator.predicate(
    "platformAdmin.mfaChallenges must be non-negative",
    mfaChallenges >= 0,
  );

  // We just created at least one admin
  TestValidator.predicate(
    "platformAdmin.totalActors should be at least 1 after join",
    totalActors >= 1,
  );

  // Join and login should yield at least one recent session and successful login
  TestValidator.predicate(
    "platformAdmin.recentSessions should be at least 1 after join/login",
    recentSessions >= 1,
  );
  TestValidator.predicate(
    "platformAdmin.successfulLogins should be at least 1 after join/login",
    successfulLogins >= 1,
  );

  // We did not perform any failing login attempts or lock operations
  // Keep them non-negative (already ensured) and ensure they are within
  // a reasonable upper bound relative to total actors (below), but do not
  // assume exact zero in a shared test environment.

  // Basic upper-bound sanity: counts should not explode relative to totalActors
  const boundMultiplier = 10;
  const maxReasonable = totalActors * boundMultiplier;

  TestValidator.predicate(
    "activeSessions should not greatly exceed totalActors",
    activeSessions <= maxReasonable,
  );
  TestValidator.predicate(
    "recentSessions should not greatly exceed totalActors",
    recentSessions <= maxReasonable,
  );
  TestValidator.predicate(
    "successfulLogins should not greatly exceed totalActors",
    successfulLogins <= maxReasonable,
  );
  TestValidator.predicate(
    "failedLoginAttempts should not greatly exceed totalActors",
    failedLoginAttempts <= maxReasonable,
  );
}
