import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallLegalHoldOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldOverview";

/**
 * Validate that an administrator who re-authenticates via login can still
 * access the legal hold overview dashboard, and that the overview payload
 * remains structurally consistent across repeated calls in the same
 * authenticated session.
 *
 * Business flow:
 *
 * 1. Register a new admin with POST /auth/admin/join, which implicitly logs them
 *    in and issues an initial JWT (token1).
 * 2. Immediately log in again with POST /auth/admin/login using the same
 *    email/password, obtaining a refreshed authorization payload (token2) and
 *    updating the SDK-managed Authorization header.
 * 3. Call GET /shoppingMall/admin/adminDashboard/legalHoldOverview using token2
 *    and validate the IShoppingMallLegalHoldOverview structure and basic
 *    business invariants.
 * 4. Call the overview endpoint a second time within the same session and confirm
 *    that access still works and that fundamental structural invariants remain
 *    valid across calls.
 *
 * The test intentionally avoids manipulating connection.headers directly or
 * simulating invalid tokens, relying instead on the SDK's built-in join/login
 * behavior and focusing on the positive re-login flow.
 */
export async function test_api_admin_legal_hold_overview_after_relogin(
  connection: api.IConnection,
) {
  // 1. Admin join (registration + implicit login -> token1)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const rawPassword: string = RandomGenerator.alphaNumeric(16);
  const password: string & tags.Format<"password"> = rawPassword as string &
    tags.Format<"password">;

  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  TestValidator.equals(
    "joined admin email should match join request email",
    joinedAdmin.email,
    email,
  );

  // Validate token structure implicitly via typia.assert above; additionally,
  // ensure access token is a non-empty string as a business assertion.
  TestValidator.predicate(
    "joined admin access token should be non-empty",
    joinedAdmin.token.access.length > 0,
  );

  // 2. Explicit login with same credentials -> token2 (re-authentication)
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "logged-in admin email should match login request email",
    loggedInAdmin.email,
    email,
  );

  TestValidator.predicate(
    "logged-in admin access token should be non-empty",
    loggedInAdmin.token.access.length > 0,
  );

  // 3. First legal hold overview call using token2
  const overview1: IShoppingMallLegalHoldOverview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connection,
    );
  typia.assert(overview1);

  // Basic non-negative invariants on top-level counts
  TestValidator.predicate(
    "totalActiveHolds should be non-negative",
    overview1.totalActiveHolds >= 0,
  );

  TestValidator.predicate(
    "activeHoldsBySubjectType.customer should be non-negative",
    overview1.activeHoldsBySubjectType.customer >= 0,
  );
  TestValidator.predicate(
    "activeHoldsBySubjectType.seller should be non-negative",
    overview1.activeHoldsBySubjectType.seller >= 0,
  );
  TestValidator.predicate(
    "activeHoldsBySubjectType.order should be non-negative",
    overview1.activeHoldsBySubjectType.order >= 0,
  );
  TestValidator.predicate(
    "activeHoldsBySubjectType.dispute should be non-negative",
    overview1.activeHoldsBySubjectType.dispute >= 0,
  );
  TestValidator.predicate(
    "activeHoldsBySubjectType.riskCase should be non-negative",
    overview1.activeHoldsBySubjectType.riskCase >= 0,
  );

  const sumSubjects1: number =
    overview1.activeHoldsBySubjectType.customer +
    overview1.activeHoldsBySubjectType.seller +
    overview1.activeHoldsBySubjectType.order +
    overview1.activeHoldsBySubjectType.dispute +
    overview1.activeHoldsBySubjectType.riskCase;

  TestValidator.predicate(
    "sum of subject-type buckets should be non-negative",
    sumSubjects1 >= 0,
  );

  // Validate aging bucket invariants
  for (const bucket of overview1.agingBuckets) {
    TestValidator.predicate(
      `aging bucket count should be non-negative for label ${bucket.label}`,
      bucket.count >= 0,
    );
    TestValidator.predicate(
      `aging bucket minDays should be non-negative for label ${bucket.label}`,
      bucket.minDays >= 0,
    );
    if (bucket.maxDays !== undefined) {
      TestValidator.predicate(
        `aging bucket maxDays should be >= minDays for label ${bucket.label}`,
        bucket.maxDays >= bucket.minDays,
      );
    }
  }

  // Validate recent activity invariants
  TestValidator.predicate(
    "recentActivity.windowDays should be at least 1",
    overview1.recentActivity.windowDays >= 1,
  );
  TestValidator.predicate(
    "recentActivity.createdCount should be non-negative",
    overview1.recentActivity.createdCount >= 0,
  );
  TestValidator.predicate(
    "recentActivity.releasedCount should be non-negative",
    overview1.recentActivity.releasedCount >= 0,
  );

  // Validate trend points invariants
  for (const point of overview1.trend.points) {
    TestValidator.predicate(
      `trend point activeCount should be non-negative for date ${point.date}`,
      point.activeCount >= 0,
    );
  }

  // 4. Second legal hold overview call in the same authenticated session
  const overview2: IShoppingMallLegalHoldOverview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connection,
    );
  typia.assert(overview2);

  // Re-validate basic invariants on the second response
  TestValidator.predicate(
    "second call: totalActiveHolds should be non-negative",
    overview2.totalActiveHolds >= 0,
  );

  const sumSubjects2: number =
    overview2.activeHoldsBySubjectType.customer +
    overview2.activeHoldsBySubjectType.seller +
    overview2.activeHoldsBySubjectType.order +
    overview2.activeHoldsBySubjectType.dispute +
    overview2.activeHoldsBySubjectType.riskCase;

  TestValidator.predicate(
    "second call: sum of subject-type buckets should be non-negative",
    sumSubjects2 >= 0,
  );

  // Structural consistency checks between overview1 and overview2 that should
  // not depend on specific metric values.
  TestValidator.equals(
    "trend points array length should be stable across consecutive calls",
    overview1.trend.points.length,
    overview2.trend.points.length,
  );

  TestValidator.equals(
    "aging bucket count should be stable across consecutive calls",
    overview1.agingBuckets.length,
    overview2.agingBuckets.length,
  );
}
