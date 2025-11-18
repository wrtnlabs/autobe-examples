import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPolicyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyStatistics";
import type { IShoppingMallPolicyStatisticsDomainSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyStatisticsDomainSummary";
import type { IShoppingMallPolicyStatisticsTypeDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyStatisticsTypeDistribution";

/**
 * Verify that policy statistics endpoint requires admin authorization.
 *
 * Business goals:
 *
 * - Prove that anonymous callers (no Authorization header) cannot read policy
 *   statistics.
 * - Prove that an authenticated admin, obtained via POST /auth/admin/join, can
 *   successfully call GET /shoppingMall/admin/statistics/policies and receive a
 *   structurally valid IShoppingMallPolicyStatistics object.
 *
 * High level steps:
 *
 * 1. Build an unauthenticated connection based on the incoming connection, but
 *    without any Authorization header attached.
 * 2. Call api.functional.shoppingMall.admin.statistics.policies.index() with that
 *    unauthenticated connection and assert that it fails by throwing an
 *    HttpError (without depending on a particular status code).
 * 3. Call api.functional.auth.admin.join() with a random but valid
 *    IShoppingMallAdminJoin.ICreate body to register a new admin. This
 *    automatically sets connection.headers.Authorization through the SDK
 *    implementation.
 * 4. Using the now-authenticated original connection, call
 *    api.functional.shoppingMall.admin.statistics.policies.index() again.
 * 5. Assert that the call succeeds, the response type matches
 *    IShoppingMallPolicyStatistics, and basic invariants between its fields
 *    hold (e.g., totals are non-negative and consistent).
 */
export async function test_api_admin_policy_statistics_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection that does not carry over any
  //    Authorization header. We must not mutate the original connection's
  //    headers object, so we construct a shallow copy with headers set to an
  //    empty object literal.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Ensure that calling the statistics endpoint without admin auth fails.
  await TestValidator.error(
    "policy statistics requires admin auth",
    async () => {
      await api.functional.shoppingMall.admin.statistics.policies.index(
        unauthenticated,
      );
    },
  );

  // 3. Register a new admin via /auth/admin/join. The DTO type for the body
  //    is IShoppingMallAdminJoin.ICreate, and the response is
  //    IShoppingMallAdmin.IAuthorized. The join() implementation also sets the
  //    Authorization header on the provided connection automatically.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 4. With admin authentication established on the original connection,
  //    call the statistics endpoint again.
  const stats: IShoppingMallPolicyStatistics =
    await api.functional.shoppingMall.admin.statistics.policies.index(
      connection,
    );
  typia.assert<IShoppingMallPolicyStatistics>(stats);

  // 5. Validate basic internal consistency of statistics using TestValidator.
  TestValidator.predicate(
    "totalPolicies is non-negative",
    stats.totalPolicies >= 0,
  );
  TestValidator.predicate(
    "activePolicies is non-negative",
    stats.activePolicies >= 0,
  );
  TestValidator.predicate(
    "retiredPolicies is non-negative",
    stats.retiredPolicies >= 0,
  );
  TestValidator.predicate(
    "effectivePolicyVersions is non-negative",
    stats.effectivePolicyVersions >= 0,
  );
  TestValidator.predicate(
    "policiesWithOverrides is non-negative",
    stats.policiesWithOverrides >= 0,
  );
  TestValidator.predicate(
    "caseSlaConfigCount is non-negative",
    stats.caseSlaConfigCount >= 0,
  );
  TestValidator.predicate(
    "recentPolicyChangeWindowDays is non-negative",
    stats.recentPolicyChangeWindowDays >= 0,
  );
  TestValidator.predicate(
    "recentPolicyChanges is non-negative",
    stats.recentPolicyChanges >= 0,
  );

  // Sum of per-domain totalPolicies should not exceed global totalPolicies.
  const sumDomainTotal = stats.policiesByDomain.reduce(
    (acc, domain) => acc + domain.totalPolicies,
    0,
  );
  TestValidator.predicate(
    "sum of domain totalPolicies does not exceed global totalPolicies",
    sumDomainTotal <= stats.totalPolicies,
  );

  // Sum of per-type policyCount should not exceed global totalPolicies.
  const sumTypeTotal = stats.policyTypeDistributions.reduce(
    (acc, dist) => acc + dist.policyCount,
    0,
  );
  TestValidator.predicate(
    "sum of type policyCount does not exceed global totalPolicies",
    sumTypeTotal <= stats.totalPolicies,
  );
}
