import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

export async function test_api_admin_risk_rule_detail_respects_logically_retired_rules(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new risk rule with a specific, unique rule_code
  const ruleCodePrefix = "e2e_retire_";
  const ruleCodeRandom = RandomGenerator.alphaNumeric(12);
  const ruleCode = `${ruleCodePrefix}${ruleCodeRandom}`;

  const expressionObject = {
    type: "threshold",
    field: "order_amount",
    operator: ">",
    value: 100000,
    windowMinutes: 60,
  };

  const createBody = {
    rule_code: ruleCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    scope: "order",
    severity: "high",
    expression_json: JSON.stringify(expressionObject),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US", "KR"]),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const created: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created.rule_code should match requested rule_code",
    created.rule_code,
    ruleCode,
  );
  TestValidator.predicate(
    "created.deleted_at should be null or undefined before retirement",
    created.deleted_at === null || created.deleted_at === undefined,
  );
  TestValidator.predicate(
    "created.is_enabled should be true before retirement",
    created.is_enabled === true,
  );

  // 3. Fetch detail before retirement to confirm active state
  const beforeDetail: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.at(connection, {
      ruleCode,
    });
  typia.assert(beforeDetail);

  TestValidator.equals(
    "beforeDetail.id should match created.id",
    beforeDetail.id,
    created.id,
  );
  TestValidator.equals(
    "beforeDetail.rule_code should match created.rule_code",
    beforeDetail.rule_code,
    created.rule_code,
  );
  TestValidator.predicate(
    "beforeDetail.deleted_at should be null or undefined before retirement",
    beforeDetail.deleted_at === null || beforeDetail.deleted_at === undefined,
  );
  TestValidator.equals(
    "beforeDetail.is_enabled should match created.is_enabled (true)",
    beforeDetail.is_enabled,
    created.is_enabled,
  );

  // 4. Logically retire the risk rule via DELETE (erase)
  const erased: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.erase(connection, {
      ruleCode,
    });
  typia.assert(erased);

  TestValidator.equals(
    "erased.id should match created.id",
    erased.id,
    created.id,
  );
  TestValidator.equals(
    "erased.rule_code should match created.rule_code",
    erased.rule_code,
    created.rule_code,
  );
  TestValidator.predicate(
    "erased.deleted_at should be non-null after retirement",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "erased.is_enabled should be false after retirement",
    erased.is_enabled === false,
  );

  // 5. Fetch detail after retirement and validate logical retirement semantics
  const afterDetail: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.at(connection, {
      ruleCode,
    });
  typia.assert(afterDetail);

  TestValidator.equals(
    "afterDetail.id should still match created.id",
    afterDetail.id,
    created.id,
  );
  TestValidator.equals(
    "afterDetail.rule_code should still match created.rule_code",
    afterDetail.rule_code,
    created.rule_code,
  );
  TestValidator.predicate(
    "afterDetail.deleted_at should be non-null after retirement",
    afterDetail.deleted_at !== null && afterDetail.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "afterDetail.is_enabled should be false after retirement",
    afterDetail.is_enabled === false,
  );

  // 6. Optional consistency: deleted_at and is_enabled should differ between before and after
  TestValidator.predicate(
    "deleted_at should change from null/undefined to non-null after retirement",
    (beforeDetail.deleted_at === null ||
      beforeDetail.deleted_at === undefined) &&
      afterDetail.deleted_at !== null &&
      afterDetail.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "is_enabled should change from true to false after retirement",
    beforeDetail.is_enabled === true && afterDetail.is_enabled === false,
  );
}
