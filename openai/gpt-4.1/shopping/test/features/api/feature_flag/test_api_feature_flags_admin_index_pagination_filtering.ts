import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingFeatureFlag";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingFeatureFlag";

/**
 * Validate admin feature flag listing with pagination and filters.
 *
 * This scenario tests the PATCH /shopping/admin/featureFlags endpoint for
 * retrieving feature flags with full pagination and advanced filtering as an
 * admin. The business purpose is to ensure that the admin can search and view
 * feature flag records reliably by all filtering and sorting options, with
 * precise control over visibility and scope.
 *
 * Steps:
 *
 * 1. Register as an admin and obtain authentication using unique email and
 *    appropriate role per RBAC policy.
 * 2. Create several feature flags with distinct values for flag_name, scope,
 *    enabled state, rollout percentage, and description to serve as test data
 *    spanning multiple filter cases. Use a mix of enabled/disabled states,
 *    different flag_name patterns, scopes (e.g., 'global', 'checkout',
 *    'orders'), and some with rollout set, some without.
 * 3. Exercise feature flag listing with PATCH /shopping/admin/featureFlags for: a.
 *    List all feature flags paginated (default sort, page/limit=2) and validate
 *    both content and accurate pagination meta. b. Filter for a specific
 *    flag_name substring (should match those containing the substring
 *    regardless of position/case). c. Filter by scope (e.g., "global"). d.
 *    Filter by enabled status (true and false), confirming only the correct
 *    subset is returned in each. e. Combine filters for flag_name + scope +
 *    enabled. f. Apply custom sort order (e.g., by created_at desc) and
 *    validate that results are sorted accordingly. g. Test result pagination
 *    (use page > 1 and check subset is correct).
 * 4. For each search, verify:
 *
 *    - Returned feature flag summaries match criteria (all fields correct, data
 *         types match, no extra/missing fields).
 *    - Pagination meta values are accurate relative to the created sample.
 *    - Sorting respects the requested order.
 * 5. [Note] Audit trail validation is out of scope for automated E2E assertion but
 *    described for completeness: ensure that flag search by an admin is
 *    properly audit-logged.
 *
 * This E2E test ensures robust searchability and manageability of the feature
 * flag system for admin operators, confirming key business requirements for
 * controlled operations and configurability.
 */
export async function test_api_feature_flags_admin_index_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const email = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(10) + "!A1b",
      name: RandomGenerator.name(),
      role: "superadmin",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);
  TestValidator.equals("registered admin email matches", admin.email, email);

  // 2. Create feature flags with different combinations
  const scopes = ["global", "checkout", "orders"] as const;
  const flagTemplates = [
    { flag: "alpha_feature", enabled: true, scope: "global", rollout: null },
    { flag: "beta_flag", enabled: false, scope: "checkout", rollout: 50 },
    { flag: "gamma_switch", enabled: true, scope: "orders", rollout: 75 },
    { flag: "delta_toggle", enabled: false, scope: "global", rollout: null },
    { flag: "epsilon_option", enabled: true, scope: "checkout", rollout: null },
    { flag: "zeta_feature", enabled: false, scope: "orders", rollout: 30 },
  ] as const;
  const created: IShoppingFeatureFlag[] = [];
  for (const t of flagTemplates) {
    const createdFlag = await api.functional.shopping.admin.featureFlags.create(
      connection,
      {
        body: {
          flag_name: t.flag,
          scope: t.scope,
          enabled: t.enabled,
          rollout: t.rollout,
          description: `${t.flag} for ${t.scope} (${t.enabled ? "ON" : "OFF"})`,
        } satisfies IShoppingFeatureFlag.ICreate,
      },
    );
    typia.assert(createdFlag);
    created.push(createdFlag);
  }

  // 3a. List all feature flags paginated (page 1, limit 2)
  let res = await api.functional.shopping.admin.featureFlags.index(connection, {
    body: {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 2 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IShoppingFeatureFlag.IRequest,
  });
  typia.assert(res);
  TestValidator.predicate(
    "page 1 returns at most 2 flags",
    res.data.length <= 2,
  );
  TestValidator.equals("page 1 current", res.pagination.current, 1);
  TestValidator.equals("page 1 limit", res.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 total records >= 6",
    res.pagination.records >= created.length,
  );
  TestValidator.predicate("page 1 total pages >= 3", res.pagination.pages >= 3);

  // 3b. Filter by flag_name substring
  const flagSubstring = "flag";
  res = await api.functional.shopping.admin.featureFlags.index(connection, {
    body: { flagName: flagSubstring } satisfies IShoppingFeatureFlag.IRequest,
  });
  typia.assert(res);
  const expectedFlags = created.filter((f) =>
    f.flag_name.includes(flagSubstring),
  );
  for (const flag of res.data) {
    TestValidator.predicate(
      `flag_name contains '${flagSubstring}'`,
      flag.flag_name.includes(flagSubstring),
    );
  }
  TestValidator.predicate(
    "at least all created flags with substring found",
    res.data.length >= expectedFlags.length,
  );

  // 3c. Filter by scope ("global")
  const scope = "global";
  res = await api.functional.shopping.admin.featureFlags.index(connection, {
    body: { scope } satisfies IShoppingFeatureFlag.IRequest,
  });
  typia.assert(res);
  const expectedByScope = created.filter((f) => f.scope === scope);
  for (const flag of res.data) {
    TestValidator.equals("flag.scope = filtered scope", flag.scope, scope);
  }
  TestValidator.predicate(
    `all expected by scope found`,
    res.data.length >= expectedByScope.length,
  );

  // 3d. Filter by enabled (true)
  res = await api.functional.shopping.admin.featureFlags.index(connection, {
    body: { enabled: true } satisfies IShoppingFeatureFlag.IRequest,
  });
  typia.assert(res);
  for (const flag of res.data) {
    TestValidator.equals("flag.enabled is true", flag.enabled, true);
  }
  // Do the same with enabled: false
  res = await api.functional.shopping.admin.featureFlags.index(connection, {
    body: { enabled: false } satisfies IShoppingFeatureFlag.IRequest,
  });
  typia.assert(res);
  for (const flag of res.data) {
    TestValidator.equals("flag.enabled is false", flag.enabled, false);
  }

  // 3e. Combine filters: flagName+scope+enabled
  const combinedFlag = flagTemplates[1];
  res = await api.functional.shopping.admin.featureFlags.index(connection, {
    body: {
      flagName: combinedFlag.flag,
      scope: combinedFlag.scope,
      enabled: combinedFlag.enabled,
    } satisfies IShoppingFeatureFlag.IRequest,
  });
  typia.assert(res);
  for (const flag of res.data) {
    TestValidator.equals(
      "flag.flag_name matches",
      flag.flag_name,
      combinedFlag.flag,
    );
    TestValidator.equals("flag.scope matches", flag.scope, combinedFlag.scope);
    TestValidator.equals(
      "flag.enabled matches",
      flag.enabled,
      combinedFlag.enabled,
    );
  }

  // 3f. Sort by created_at desc, ensure results are sorted
  res = await api.functional.shopping.admin.featureFlags.index(connection, {
    body: {
      sortBy: "created_at",
      order: "desc",
    } satisfies IShoppingFeatureFlag.IRequest,
  });
  typia.assert(res);
  for (let i = 1; i < res.data.length; ++i) {
    TestValidator.predicate(
      "created_at descending sort",
      res.data[i - 1].created_at >= res.data[i].created_at,
    );
  }

  // 3g. Pagination page 2
  res = await api.functional.shopping.admin.featureFlags.index(connection, {
    body: {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 2 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IShoppingFeatureFlag.IRequest,
  });
  typia.assert(res);
  TestValidator.equals("page 2 current", res.pagination.current, 2);
  TestValidator.equals("page 2 limit", res.pagination.limit, 2);
  TestValidator.predicate(
    "page 2 records >= 0 and <=2",
    0 <= res.data.length && res.data.length <= 2,
  );
}
