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
 * Basic access test for admin policy statistics overview.
 *
 * This scenario ensures that:
 *
 * 1. A newly joined administrator can authenticate via POST /auth/admin/join.
 * 2. The admin can call GET /shoppingMall/admin/statistics/policies successfully.
 * 3. The response structure conforms to IShoppingMallPolicyStatistics and contains
 *    non-negative counters and always-present array fields.
 * 4. Domain and type distribution arrays, when non-empty, have sensible values for
 *    their summary objects.
 * 5. The statistics endpoint is read-only and can be called repeatedly without
 *    breaking structural invariants.
 */
export async function test_api_admin_policy_statistics_basic_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorization context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // At this point, SDK has populated connection.headers.Authorization.

  // 2. Call policy statistics endpoint (first call)
  const stats1: IShoppingMallPolicyStatistics =
    await api.functional.shoppingMall.admin.statistics.policies.index(
      connection,
    );
  typia.assert<IShoppingMallPolicyStatistics>(stats1);

  // 3. Validate top-level numeric counters are non-negative
  TestValidator.predicate(
    "totalPolicies is non-negative",
    stats1.totalPolicies >= 0,
  );
  TestValidator.predicate(
    "activePolicies is non-negative",
    stats1.activePolicies >= 0,
  );
  TestValidator.predicate(
    "retiredPolicies is non-negative",
    stats1.retiredPolicies >= 0,
  );
  TestValidator.predicate(
    "effectivePolicyVersions is non-negative",
    stats1.effectivePolicyVersions >= 0,
  );
  TestValidator.predicate(
    "policiesWithOverrides is non-negative",
    stats1.policiesWithOverrides >= 0,
  );
  TestValidator.predicate(
    "caseSlaConfigCount is non-negative",
    stats1.caseSlaConfigCount >= 0,
  );
  TestValidator.predicate(
    "recentPolicyChangeWindowDays is non-negative",
    stats1.recentPolicyChangeWindowDays >= 0,
  );
  TestValidator.predicate(
    "recentPolicyChanges is non-negative",
    stats1.recentPolicyChanges >= 0,
  );

  // Soft consistency: active and retired should not exceed total
  TestValidator.predicate(
    "activePolicies does not exceed totalPolicies",
    stats1.activePolicies <= stats1.totalPolicies,
  );
  TestValidator.predicate(
    "retiredPolicies does not exceed totalPolicies",
    stats1.retiredPolicies <= stats1.totalPolicies,
  );

  // 4. Validate policiesByDomain
  TestValidator.predicate(
    "policiesByDomain is an array",
    Array.isArray(stats1.policiesByDomain),
  );

  const domains: IShoppingMallPolicyStatisticsDomainSummary[] =
    stats1.policiesByDomain;

  if (domains.length === 0) {
    TestValidator.equals(
      "policiesByDomain is explicitly an empty array when no domains",
      domains,
      [],
    );
  } else {
    for (const domain of domains) {
      TestValidator.predicate(
        "domainCode is non-empty string",
        typeof domain.domainCode === "string" && domain.domainCode.length > 0,
      );
      TestValidator.predicate(
        "domainName is non-empty string",
        typeof domain.domainName === "string" && domain.domainName.length > 0,
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
        "domain.activePolicies does not exceed domain.totalPolicies",
        domain.activePolicies <= domain.totalPolicies,
      );
      TestValidator.predicate(
        "domain.overriddenPolicies does not exceed domain.totalPolicies",
        domain.overriddenPolicies <= domain.totalPolicies,
      );
    }
  }

  // 5. Validate policyTypeDistributions
  TestValidator.predicate(
    "policyTypeDistributions is an array",
    Array.isArray(stats1.policyTypeDistributions),
  );

  const typeDistributions: IShoppingMallPolicyStatisticsTypeDistribution[] =
    stats1.policyTypeDistributions;

  if (typeDistributions.length === 0) {
    TestValidator.equals(
      "policyTypeDistributions is explicitly an empty array when no types",
      typeDistributions,
      [],
    );
  } else {
    for (const typeDist of typeDistributions) {
      TestValidator.predicate(
        "typeCode is non-empty string",
        typeof typeDist.typeCode === "string" && typeDist.typeCode.length > 0,
      );
      TestValidator.predicate(
        "typeName is non-empty string",
        typeof typeDist.typeName === "string" && typeDist.typeName.length > 0,
      );
      TestValidator.predicate(
        "policyCount is non-negative",
        typeDist.policyCount >= 0,
      );
    }
  }

  // 6. Optional aggregate checks (very weak, to avoid over-constraining)
  if (domains.length > 0) {
    const sumDomainTotal = domains.reduce((acc, d) => acc + d.totalPolicies, 0);
    TestValidator.predicate(
      "sum of domain totalPolicies is non-negative",
      sumDomainTotal >= 0,
    );
  }

  if (typeDistributions.length > 0) {
    const sumTypeCount = typeDistributions.reduce(
      (acc, t) => acc + t.policyCount,
      0,
    );
    TestValidator.predicate(
      "sum of policy type counts is non-negative",
      sumTypeCount >= 0,
    );
  }

  // 7. Call the statistics endpoint again to ensure it remains readable and
  // structurally stable (basic read-only/idempotency check).
  const stats2: IShoppingMallPolicyStatistics =
    await api.functional.shoppingMall.admin.statistics.policies.index(
      connection,
    );
  typia.assert<IShoppingMallPolicyStatistics>(stats2);

  // Ensure core counters remain within reasonable expectations across calls.
  TestValidator.predicate(
    "second call totalPolicies is non-negative",
    stats2.totalPolicies >= 0,
  );
  TestValidator.predicate(
    "second call activePolicies is non-negative",
    stats2.activePolicies >= 0,
  );
  TestValidator.predicate(
    "second call retiredPolicies is non-negative",
    stats2.retiredPolicies >= 0,
  );
}
