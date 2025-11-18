import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskRule";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

export async function test_api_risk_rules_search_with_filters_by_scope_severity_and_enabled(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Seed several risk rules with different scope/severity/is_enabled combinations
  const baseExpression = JSON.stringify({ type: "threshold", threshold: 10 });

  const ruleA = await api.functional.shoppingMall.admin.riskRules.create(
    connection,
    {
      body: {
        rule_code: `order_high_enabled_${RandomGenerator.alphaNumeric(8)}`,
        name: "Rule A - order high enabled",
        scope: "order",
        severity: "high",
        expression_json: baseExpression,
        description: "Order scope, high severity, enabled",
        is_enabled: true,
        applies_to_countries: null,
        effective_from: null,
        effective_until: null,
      } satisfies IShoppingMallRiskRule.ICreate,
    },
  );
  typia.assert(ruleA);

  const ruleB = await api.functional.shoppingMall.admin.riskRules.create(
    connection,
    {
      body: {
        rule_code: `order_low_disabled_${RandomGenerator.alphaNumeric(8)}`,
        name: "Rule B - order low disabled",
        scope: "order",
        severity: "low",
        expression_json: baseExpression,
        description: "Order scope, low severity, disabled",
        is_enabled: false,
        applies_to_countries: null,
        effective_from: null,
        effective_until: null,
      } satisfies IShoppingMallRiskRule.ICreate,
    },
  );
  typia.assert(ruleB);

  const ruleC = await api.functional.shoppingMall.admin.riskRules.create(
    connection,
    {
      body: {
        rule_code: `account_high_enabled_${RandomGenerator.alphaNumeric(8)}`,
        name: "Rule C - account high enabled",
        scope: "account",
        severity: "high",
        expression_json: baseExpression,
        description: "Account scope, high severity, enabled",
        is_enabled: true,
        applies_to_countries: null,
        effective_from: null,
        effective_until: null,
      } satisfies IShoppingMallRiskRule.ICreate,
    },
  );
  typia.assert(ruleC);

  // 3. Search with full filter combination: scope=order, severity=high, is_enabled=true
  const filterStrictBody = {
    page: 1,
    limit: 20,
    rule_code: null,
    name: null,
    scope: "order",
    severity: "high",
    is_enabled: true,
    effective_at: null,
    country_code: null,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallRiskRule.IRequest;

  const strictPage = await api.functional.shoppingMall.admin.riskRules.index(
    connection,
    {
      body: filterStrictBody,
    },
  );
  typia.assert(strictPage);

  // Assert that only ruleA appears in the result set
  const strictIds = strictPage.data.map((r) => r.id);
  TestValidator.predicate(
    "strict filter should return at least one result",
    strictIds.length > 0,
  );
  TestValidator.predicate(
    "strict filter should include ruleA",
    strictIds.includes(ruleA.id),
  );
  TestValidator.predicate(
    "strict filter should not include ruleB",
    strictIds.includes(ruleB.id) === false,
  );
  TestValidator.predicate(
    "strict filter should not include ruleC",
    strictIds.includes(ruleC.id) === false,
  );

  // 4. Relax filters: scope=order, severity=null, is_enabled=null
  const filterScopeOnlyBody = {
    page: 1,
    limit: 20,
    rule_code: null,
    name: null,
    scope: "order",
    severity: null,
    is_enabled: null,
    effective_at: null,
    country_code: null,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallRiskRule.IRequest;

  const scopeOnlyPage = await api.functional.shoppingMall.admin.riskRules.index(
    connection,
    {
      body: filterScopeOnlyBody,
    },
  );
  typia.assert(scopeOnlyPage);

  const scopeOnlyIds = scopeOnlyPage.data.map((r) => r.id);
  TestValidator.predicate(
    "scope-only filter should include ruleA",
    scopeOnlyIds.includes(ruleA.id),
  );
  TestValidator.predicate(
    "scope-only filter should include ruleB",
    scopeOnlyIds.includes(ruleB.id),
  );
  TestValidator.predicate(
    "scope-only filter should not include ruleC",
    scopeOnlyIds.includes(ruleC.id) === false,
  );

  // 5. Verify pagination: limit=1 so that results are paged
  const filterPagedBody = {
    page: 1,
    limit: 1,
    rule_code: null,
    name: null,
    scope: "order",
    severity: null,
    is_enabled: null,
    effective_at: null,
    country_code: null,
    search: null,
    order_by: "rule_code",
    order_direction: "asc",
  } satisfies IShoppingMallRiskRule.IRequest;

  const pagedPage1 = await api.functional.shoppingMall.admin.riskRules.index(
    connection,
    {
      body: filterPagedBody,
    },
  );
  typia.assert(pagedPage1);

  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagedPage1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "paged page1 should have at most 1 record",
    pagedPage1.data.length <= 1,
  );

  if (pagedPage1.pagination.records > 1) {
    const filterPagedBodyPage2 = {
      ...filterPagedBody,
      page: 2,
    } satisfies IShoppingMallRiskRule.IRequest;

    const pagedPage2 = await api.functional.shoppingMall.admin.riskRules.index(
      connection,
      {
        body: filterPagedBodyPage2,
      },
    );
    typia.assert(pagedPage2);

    TestValidator.equals(
      "pagination.current should follow requested page",
      pagedPage2.pagination.current,
      2,
    );
  }
}
