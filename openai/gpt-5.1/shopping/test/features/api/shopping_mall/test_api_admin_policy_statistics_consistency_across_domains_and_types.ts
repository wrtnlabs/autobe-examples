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
 * Validate consistency and coherence of admin policy statistics across
 * top-level counters, per-domain summaries, and per-type distributions.
 *
 * Business workflow:
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an authorized
 *    administrator context and have the SDK attach the Authorization header to
 *    the shared connection.
 * 2. Call GET /shoppingMall/admin/statistics/policies to retrieve
 *    IShoppingMallPolicyStatistics, asserting the response shape.
 * 3. Validate top-level non-negativity and relationship constraints like
 *    totalPolicies >= activePolicies/retiredPolicies and
 *    effectivePolicyVersions >= activePolicies.
 * 4. Iterate policiesByDomain, asserting each
 *    IShoppingMallPolicyStatisticsDomainSummary and checking that domain
 *    codes/names are non-empty and counts are internally consistent.
 * 5. Iterate policyTypeDistributions, asserting each
 *    IShoppingMallPolicyStatisticsTypeDistribution and verifying basic
 *    non-negativity and non-empty identifiers.
 * 6. Apply soft scenario checks: when there are no policies, all counts and
 *    breakdown arrays should be effectively empty; when policies exist, at
 *    least one breakdown array should contain entries.
 * 7. Call the statistics endpoint a second time to ensure structural stability of
 *    the response (array lengths and window configuration), without enforcing
 *    strict equality on dynamic counters.
 */
export async function test_api_admin_policy_statistics_consistency_across_domains_and_types(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication using random, valid join payload
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. First statistics fetch
  const stats: IShoppingMallPolicyStatistics =
    await api.functional.shoppingMall.admin.statistics.policies.index(
      connection,
    );
  typia.assert(stats);

  // 3. Top-level non-negativity checks
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

  // 4. Top-level relationship checks
  TestValidator.predicate(
    "totalPolicies >= activePolicies",
    stats.totalPolicies >= stats.activePolicies,
  );
  TestValidator.predicate(
    "totalPolicies >= retiredPolicies",
    stats.totalPolicies >= stats.retiredPolicies,
  );
  TestValidator.predicate(
    "effectivePolicyVersions >= activePolicies",
    stats.effectivePolicyVersions >= stats.activePolicies,
  );

  if (stats.totalPolicies === 0) {
    TestValidator.predicate(
      "recentPolicyChanges is not absurdly large when no policies exist",
      stats.recentPolicyChanges <= 1_000,
    );
  }

  // 5. Domain summaries
  let sumDomainTotal = 0;
  for (const domain of stats.policiesByDomain) {
    typia.assert<IShoppingMallPolicyStatisticsDomainSummary>(domain);

    sumDomainTotal += domain.totalPolicies;

    TestValidator.predicate(
      "domainCode is non-empty",
      domain.domainCode.length > 0,
    );
    TestValidator.predicate(
      "domainName is non-empty",
      domain.domainName.length > 0,
    );
    TestValidator.predicate(
      "domain.totalPolicies is non-negative",
      domain.totalPolicies >= 0,
    );
    TestValidator.predicate(
      "domain.activePolicies is non-negative",
      domain.activePolicies >= 0,
    );
    TestValidator.predicate(
      "domain.overriddenPolicies is non-negative",
      domain.overriddenPolicies >= 0,
    );
    TestValidator.predicate(
      "domain.activePolicies <= domain.totalPolicies",
      domain.activePolicies <= domain.totalPolicies,
    );
    TestValidator.predicate(
      "domain.overriddenPolicies <= domain.totalPolicies",
      domain.overriddenPolicies <= domain.totalPolicies,
    );
  }

  if (stats.totalPolicies > 0) {
    TestValidator.predicate(
      "sum of domain totalPolicies is at least activePolicies",
      sumDomainTotal >= stats.activePolicies,
    );
    TestValidator.predicate(
      "sum of domain totalPolicies is not excessively larger than totalPolicies",
      sumDomainTotal <= stats.totalPolicies * 2,
    );
  }

  // 6. Type distributions
  let sumTypePolicies = 0;
  for (const typeDist of stats.policyTypeDistributions) {
    typia.assert<IShoppingMallPolicyStatisticsTypeDistribution>(typeDist);

    sumTypePolicies += typeDist.policyCount;

    TestValidator.predicate(
      "typeCode is non-empty",
      typeDist.typeCode.length > 0,
    );
    TestValidator.predicate(
      "typeName is non-empty",
      typeDist.typeName.length > 0,
    );
    TestValidator.predicate(
      "policyCount is non-negative",
      typeDist.policyCount >= 0,
    );
  }

  if (stats.totalPolicies > 0) {
    TestValidator.predicate(
      "sum of type policyCount is non-negative and reasonable",
      sumTypePolicies >= 0 && sumTypePolicies <= stats.totalPolicies * 10,
    );
  }

  // 7. Soft scenario checks: no policies vs some policies
  if (stats.totalPolicies === 0) {
    TestValidator.predicate(
      "no activePolicies when totalPolicies is zero",
      stats.activePolicies === 0,
    );
    TestValidator.predicate(
      "no retiredPolicies when totalPolicies is zero",
      stats.retiredPolicies === 0,
    );
    TestValidator.predicate(
      "no domain summaries when totalPolicies is zero",
      stats.policiesByDomain.length === 0,
    );
    TestValidator.predicate(
      "no type distributions when totalPolicies is zero",
      stats.policyTypeDistributions.length === 0,
    );
  } else {
    TestValidator.predicate(
      "when policies exist, at least one breakdown array has entries",
      stats.policiesByDomain.length > 0 ||
        stats.policyTypeDistributions.length > 0,
    );
  }

  // 8. Stability across multiple calls
  const stats2: IShoppingMallPolicyStatistics =
    await api.functional.shoppingMall.admin.statistics.policies.index(
      connection,
    );
  typia.assert(stats2);

  TestValidator.equals(
    "policiesByDomain length is stable across calls",
    stats.policiesByDomain.length,
    stats2.policiesByDomain.length,
  );
  TestValidator.equals(
    "policyTypeDistributions length is stable across calls",
    stats.policyTypeDistributions.length,
    stats2.policyTypeDistributions.length,
  );
  TestValidator.equals(
    "recentPolicyChangeWindowDays is stable across calls",
    stats.recentPolicyChangeWindowDays,
    stats2.recentPolicyChangeWindowDays,
  );
}
