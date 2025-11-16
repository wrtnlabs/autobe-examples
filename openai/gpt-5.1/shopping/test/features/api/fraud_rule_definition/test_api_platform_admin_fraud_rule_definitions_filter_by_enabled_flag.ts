import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFraudRuleDefinition";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that platform admin fraud rule search filters correctly by is_enabled
 * flag.
 *
 * Business goal:
 *
 * - Ensure a platform administrator can retrieve only active or only disabled
 *   fraud rules.
 * - Confirm that combining is_enabled with scope/severity filters still respects
 *   all filters.
 *
 * Steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join.
 * 2. Seed multiple fraud rule definitions via POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions
 *
 *    - Some with isEnabled = true (enabled rules).
 *    - Some with isEnabled = false (disabled rules).
 *    - Use at least two distinct scopes and severities so that combined filters can
 *         be tested.
 * 3. Call PATCH /shoppingMall/platformAdmin/fraudRuleDefinitions with
 *    body.is_enabled = true.
 *
 *    - Assert that all returned summaries have is_enabled === true.
 *    - Assert that every enabled seeded rule with the tested prefix is present in
 *         the result set.
 * 4. Call PATCH again with body.is_enabled = false.
 *
 *    - Assert that all returned summaries have is_enabled === false.
 *    - Assert that no enabled rules appear in the result set.
 * 5. Call PATCH with body combining is_enabled = true and a specific scope value
 *    that was used during seeding.
 *
 *    - Assert that all returned summaries match both the enabled flag and the chosen
 *         scope.
 * 6. For at least one search response, validate pagination metadata coherence:
 *
 *    - Pagination.records >= data.length
 *    - If pagination.records > 0 then pagination.pages >= 1.
 */
export async function test_api_platform_admin_fraud_rule_definitions_filter_by_enabled_flag(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Seed fraud rule definitions: mix of enabled/disabled, scopes, severities
  const scopes = ["order", "payment"] as const;
  const severities = ["low", "high"] as const;

  type SeedRule = {
    created: IShoppingMallFraudRuleDefinition;
  };

  const enabledRules: SeedRule[] = [];
  const disabledRules: SeedRule[] = [];

  const createRule = async (
    ruleCode: string,
    isEnabled: boolean,
    scope: (typeof scopes)[number],
    severity: (typeof severities)[number],
  ): Promise<SeedRule> => {
    const body = {
      ruleCode,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      scope,
      severity,
      ruleExpression: RandomGenerator.content({ paragraphs: 1 }),
      isEnabled,
    } satisfies IShoppingMallFraudRuleDefinition.ICreate;

    const created =
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallFraudRuleDefinition>(created);
    return { created };
  };

  const baseCode = RandomGenerator.alphaNumeric(8);

  const enabledRule1 = await createRule(
    `${baseCode}_ENABLED_1`,
    true,
    "order",
    "high",
  );
  const enabledRule2 = await createRule(
    `${baseCode}_ENABLED_2`,
    true,
    "payment",
    "low",
  );
  const disabledRule1 = await createRule(
    `${baseCode}_DISABLED_1`,
    false,
    "order",
    "low",
  );
  const disabledRule2 = await createRule(
    `${baseCode}_DISABLED_2`,
    false,
    "payment",
    "high",
  );

  enabledRules.push(enabledRule1, enabledRule2);
  disabledRules.push(disabledRule1, disabledRule2);

  // 3. Search with is_enabled = true
  const enabledSearchBody = {
    is_enabled: true,
    rule_code_prefix: baseCode,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallFraudRuleDefinition.IRequest;

  const enabledPage: IPageIShoppingMallFraudRuleDefinition.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
      connection,
      { body: enabledSearchBody },
    );
  typia.assert<IPageIShoppingMallFraudRuleDefinition.ISummary>(enabledPage);

  // Assert pagination consistency for enabled search
  TestValidator.predicate(
    "pagination.records should be >= number of data items (enabled search)",
    enabledPage.pagination.records >= enabledPage.data.length,
  );
  if (enabledPage.pagination.records > 0) {
    TestValidator.predicate(
      "pagination.pages should be >= 1 when there are records (enabled search)",
      enabledPage.pagination.pages >= 1,
    );
  }

  // Assert all returned rules are enabled and match prefix
  for (const summary of enabledPage.data) {
    TestValidator.predicate(
      "all summaries from enabled search must have is_enabled === true",
      summary.is_enabled === true,
    );
    TestValidator.predicate(
      "all summaries from enabled search must match rule_code_prefix",
      summary.rule_code.startsWith(baseCode),
    );
  }

  // Ensure all seeded enabled rules with prefix are present in the enabled result set
  const enabledIds = enabledPage.data.map((s) => s.id);
  for (const seed of enabledRules) {
    TestValidator.predicate(
      "enabled search should contain all seeded enabled rules with matching prefix",
      enabledIds.includes(seed.created.id),
    );
  }

  // 4. Search with is_enabled = false
  const disabledSearchBody = {
    is_enabled: false,
    rule_code_prefix: baseCode,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallFraudRuleDefinition.IRequest;

  const disabledPage: IPageIShoppingMallFraudRuleDefinition.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
      connection,
      { body: disabledSearchBody },
    );
  typia.assert<IPageIShoppingMallFraudRuleDefinition.ISummary>(disabledPage);

  // Assert all returned rules are disabled and match prefix
  for (const summary of disabledPage.data) {
    TestValidator.predicate(
      "all summaries from disabled search must have is_enabled === false",
      summary.is_enabled === false,
    );
    TestValidator.predicate(
      "all summaries from disabled search must match rule_code_prefix",
      summary.rule_code.startsWith(baseCode),
    );
  }

  // Ensure no enabled rule appears in disabled results
  const disabledIds = disabledPage.data.map((s) => s.id);
  for (const seed of enabledRules) {
    TestValidator.predicate(
      "disabled search must not contain any enabled seeded rule",
      disabledIds.includes(seed.created.id) === false,
    );
  }

  // Ensure all seeded disabled rules with prefix are present in the disabled result set
  for (const seed of disabledRules) {
    TestValidator.predicate(
      "disabled search should contain all seeded disabled rules with matching prefix",
      disabledIds.includes(seed.created.id),
    );
  }

  // 5. Combined filter: is_enabled = true with a specific scope
  const combinedScope = "order";
  const combinedSearchBody = {
    is_enabled: true,
    scopes: [combinedScope],
    rule_code_prefix: baseCode,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallFraudRuleDefinition.IRequest;

  const combinedPage: IPageIShoppingMallFraudRuleDefinition.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
      connection,
      { body: combinedSearchBody },
    );
  typia.assert<IPageIShoppingMallFraudRuleDefinition.ISummary>(combinedPage);

  for (const summary of combinedPage.data) {
    TestValidator.predicate(
      "combined search must return only enabled rules",
      summary.is_enabled === true,
    );
    TestValidator.predicate(
      "combined search must return only rules within the requested scope",
      summary.scope === combinedScope,
    );
    TestValidator.predicate(
      "combined search must still respect rule_code_prefix",
      summary.rule_code.startsWith(baseCode),
    );
  }

  // Ensure at least the enabled rule with matching scope is present in combined results
  const combinedIds = combinedPage.data.map((s) => s.id);
  TestValidator.predicate(
    "combined search should contain enabled rule with matching scope",
    combinedIds.includes(enabledRule1.created.id),
  );
}
