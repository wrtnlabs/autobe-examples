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
 * Validate that a platform admin can search fraud rule definitions with basic
 * filters (scope + severity + is_enabled) and that pagination and sorting
 * behave correctly.
 *
 * Business flow:
 *
 * 1. Register a platform admin via auth.platformAdmin.join.
 * 2. As that admin, create multiple fraud rule definitions with varied scope,
 *    severity, isEnabled, and deterministic ruleCode patterns.
 * 3. Search using PATCH /shoppingMall/platformAdmin/fraudRuleDefinitions with
 *    filters targeting a specific scope and severity and only enabled rules.
 * 4. Verify that only matching rules are returned, that the result is sorted as
 *    requested, and that pagination metadata is consistent with the total
 *    number of matching rules.
 */
export async function test_api_platform_admin_fraud_rule_definitions_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a platform admin
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create fraud rule definitions with varied attributes
  type CreatedRule = {
    entity: IShoppingMallFraudRuleDefinition;
    scope: string;
    severity: string;
    isEnabled: boolean;
  };

  const createdRules: CreatedRule[] = [];

  const scopes = ["order", "payment"] as const;
  const severities = ["low", "high"] as const;

  // Create a small but diverse set of rules
  for (let i = 0; i < 6; i++) {
    const scope = scopes[i % scopes.length];
    const severity = severities[i % severities.length];
    const isEnabled = i % 2 === 0; // alternate true/false

    const ruleCode = `RULE_${scope.toUpperCase()}_${severity.toUpperCase()}_${i}`;
    const name = `Fraud rule ${i} for ${scope} ${severity}`;

    const createBody = {
      ruleCode,
      name,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      scope,
      severity,
      ruleExpression: RandomGenerator.paragraph({ sentences: 6 }),
      isEnabled,
    } satisfies IShoppingMallFraudRuleDefinition.ICreate;

    const created =
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
        connection,
        { body: createBody },
      );
    typia.assert<IShoppingMallFraudRuleDefinition>(created);

    createdRules.push({
      entity: created,
      scope,
      severity,
      isEnabled,
    });
  }

  // Compute the expected set of matching rules for our filter
  const expectedMatches = createdRules
    .filter((r) => r.scope === "order" && r.severity === "high" && r.isEnabled)
    .map((r) => r.entity)
    .sort((a, b) => a.ruleCode.localeCompare(b.ruleCode));

  // 3. Search with filters: scopes=["order"], severities=["high"], is_enabled=true
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchBody = {
    scopes: ["order"],
    severities: ["high"],
    is_enabled: true,
    page,
    limit,
    sort_by: "rule_code",
    sort_order: "asc",
  } satisfies IShoppingMallFraudRuleDefinition.IRequest;

  const pageResult: IPageIShoppingMallFraudRuleDefinition.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
      connection,
      { body: searchBody },
    );
  typia.assert<IPageIShoppingMallFraudRuleDefinition.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const data = pageResult.data;

  // 4. Validate pagination metadata consistency
  await TestValidator.predicate(
    "pagination current should be zero-based page-1",
    async () => pagination.current === page - 1,
  );

  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    limit,
  );

  const totalMatching = expectedMatches.length;
  TestValidator.equals(
    "pagination records should equal number of matching rules",
    pagination.records,
    totalMatching,
  );

  const expectedPages =
    totalMatching === 0 ? 0 : Math.ceil(totalMatching / pagination.limit);
  TestValidator.equals(
    "pagination pages should be ceil(records/limit)",
    pagination.pages,
    expectedPages,
  );

  // 5. Validate data contents and sorting
  // Data length should be min(limit, totalMatching - offset)
  const offset = pagination.current * pagination.limit;
  const expectedLength = Math.max(
    0,
    Math.min(pagination.limit, totalMatching - offset),
  );
  TestValidator.equals(
    "returned page size should match expected slice size",
    data.length,
    expectedLength,
  );

  // For each summary, verify filters and structural expectations
  for (const summary of data) {
    TestValidator.equals(
      "summary scope must be 'order'",
      summary.scope,
      "order",
    );
    TestValidator.equals(
      "summary severity must be 'high'",
      summary.severity,
      "high",
    );
    TestValidator.equals(
      "summary is_enabled must be true",
      summary.is_enabled,
      true,
    );

    // Ensure this result comes from one of the created rules
    const source = expectedMatches.find(
      (r) => r.id === summary.id && r.ruleCode === summary.rule_code,
    );
    TestValidator.predicate(
      "summary must correspond to an expected matching rule",
      source !== undefined,
    );
  }

  // Validate ascending sort order by rule_code
  const sortedRuleCodes = data.map((s) => s.rule_code);
  const manuallySorted = [...sortedRuleCodes].sort((a, b) =>
    a.localeCompare(b),
  );
  TestValidator.equals(
    "results must be sorted by rule_code ascending",
    sortedRuleCodes,
    manuallySorted,
  );
}
