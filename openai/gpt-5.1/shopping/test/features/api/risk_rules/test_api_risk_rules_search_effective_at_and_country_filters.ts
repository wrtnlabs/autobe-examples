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

/**
 * Verify that the admin risk rules search endpoint correctly applies temporal
 * (`effective_at`) and geographic (`country_code`) filters.
 *
 * Business flow:
 *
 * 1. Join an admin account to obtain an authenticated admin context.
 * 2. Create three risk rules with different effective windows and country
 *    applicability:
 *
 *    - Rule A: currently effective for country US.
 *    - Rule B: future effective window for country US.
 *    - Rule C: currently effective for country KR.
 * 3. Search risk rules with effective_at = now and country_code = "US" and ensure
 *    Rule A is included while Rule B and Rule C are excluded.
 * 4. Search again with effective_at set between Rule A.effective_until and Rule
 *    B.effective_from (still for US) and ensure no rules are returned,
 *    validating that no rule is effective at that instant.
 */
export async function test_api_risk_rules_search_effective_at_and_country_filters(
  connection: api.IConnection,
) {
  // 1. Join an admin to get authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // satisfies Format<"password"> at runtime
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare effective windows around current time
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const yesterday = new Date(now.getTime() - oneDayMs);
  const tomorrow = new Date(now.getTime() + oneDayMs);
  const nextWeek = new Date(now.getTime() + 7 * oneDayMs);
  const nextMonth = new Date(now.getTime() + 30 * oneDayMs);

  const effectiveFromA = yesterday.toISOString();
  const effectiveUntilA = tomorrow.toISOString();
  const effectiveFromB = nextWeek.toISOString();
  const effectiveUntilB = nextMonth.toISOString();
  const effectiveFromC = effectiveFromA;
  const effectiveUntilC = effectiveUntilA;

  // 2-1. Create Rule A (effective now, US)
  const ruleABody = {
    rule_code: `RULE_A_${RandomGenerator.alphaNumeric(8)}`,
    name: "Rule A - US current window",
    scope: "order",
    severity: "high",
    expression_json: JSON.stringify({ type: "threshold", value: 1 }),
    description: "Rule A: applies to US and is currently effective",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US"]),
    effective_from: effectiveFromA,
    effective_until: effectiveUntilA,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleA = await api.functional.shoppingMall.admin.riskRules.create(
    connection,
    { body: ruleABody },
  );
  typia.assert<IShoppingMallRiskRule>(ruleA);

  // 2-2. Create Rule B (future window, US)
  const ruleBBody = {
    rule_code: `RULE_B_${RandomGenerator.alphaNumeric(8)}`,
    name: "Rule B - US future window",
    scope: "order",
    severity: "medium",
    expression_json: JSON.stringify({ type: "threshold", value: 2 }),
    description: "Rule B: applies to US but is not yet effective",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US"]),
    effective_from: effectiveFromB,
    effective_until: effectiveUntilB,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleB = await api.functional.shoppingMall.admin.riskRules.create(
    connection,
    { body: ruleBBody },
  );
  typia.assert<IShoppingMallRiskRule>(ruleB);

  // 2-3. Create Rule C (effective now, KR)
  const ruleCBody = {
    rule_code: `RULE_C_${RandomGenerator.alphaNumeric(8)}`,
    name: "Rule C - KR current window",
    scope: "order",
    severity: "low",
    expression_json: JSON.stringify({ type: "threshold", value: 3 }),
    description: "Rule C: applies to KR and is currently effective",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["KR"]),
    effective_from: effectiveFromC,
    effective_until: effectiveUntilC,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleC = await api.functional.shoppingMall.admin.riskRules.create(
    connection,
    { body: ruleCBody },
  );
  typia.assert<IShoppingMallRiskRule>(ruleC);

  // 3. Search with effective_at = now and country_code = "US"
  const firstSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    rule_code: null,
    name: null,
    scope: null,
    severity: null,
    is_enabled: null,
    effective_at: now.toISOString(),
    country_code: "US",
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallRiskRule.IRequest;

  const firstPage = await api.functional.shoppingMall.admin.riskRules.index(
    connection,
    {
      body: firstSearchBody,
    },
  );
  typia.assert<IPageIShoppingMallRiskRule.ISummary>(firstPage);

  const firstIds = firstPage.data.map((r) => r.rule_code);

  // Ensure at least one rule is returned
  TestValidator.predicate(
    "first search returns at least one rule",
    firstPage.data.length > 0,
  );

  // Ensure Rule A is included
  TestValidator.predicate(
    "first search includes Rule A by rule_code",
    firstIds.includes(ruleA.rule_code),
  );

  // Ensure Rule B (future window) is excluded
  TestValidator.predicate(
    "first search does not include Rule B (future window)",
    !firstIds.includes(ruleB.rule_code),
  );

  // Ensure Rule C (different country) is excluded
  TestValidator.predicate(
    "first search does not include Rule C (different country)",
    !firstIds.includes(ruleC.rule_code),
  );

  // Pagination sanity checks
  TestValidator.predicate(
    "pagination records >= data length",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    firstPage.pagination.current === 1,
  );

  // 4. Search with effective_at between Rule A.effective_until and Rule B.effective_from
  const betweenMillis =
    (new Date(effectiveUntilA).getTime() + new Date(effectiveFromB).getTime()) /
    2;
  const between = new Date(betweenMillis).toISOString();

  const secondSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    rule_code: null,
    name: null,
    scope: null,
    severity: null,
    is_enabled: null,
    effective_at: between,
    country_code: "US",
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallRiskRule.IRequest;

  const secondPage = await api.functional.shoppingMall.admin.riskRules.index(
    connection,
    {
      body: secondSearchBody,
    },
  );
  typia.assert<IPageIShoppingMallRiskRule.ISummary>(secondPage);

  // At this point, no rule should be effective for US
  TestValidator.predicate(
    "second search returns no rules when none are effective",
    secondPage.data.length === 0,
  );
}
