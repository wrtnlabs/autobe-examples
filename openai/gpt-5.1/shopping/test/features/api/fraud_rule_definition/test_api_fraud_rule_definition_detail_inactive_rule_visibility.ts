import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate visibility and state transitions of disabled fraud rule definitions
 * in the platform-admin detail endpoint.
 *
 * Business context: Platform administrators configure fraud rules that the
 * fraud engine evaluates against orders, payments, accounts, etc. Rules can be
 * disabled (isEnabled=false) to temporarily suspend their enforcement while
 * still retaining configuration for audit, review, or future reactivation. The
 * detail endpoint GET
 * /shoppingMall/platformAdmin/fraudRuleDefinitions/{ruleCode} must therefore
 * return both active and inactive rules.
 *
 * This test ensures that:
 *
 * 1. A newly created fraud rule with isEnabled=false is retrievable via the detail
 *    endpoint and clearly indicates isEnabled=false.
 * 2. After toggling isEnabled to true via the update endpoint, the detail endpoint
 *    reflects the new isEnabled=true state.
 *
 * High-level steps:
 *
 * 1. Join as a platform admin to establish authenticated context.
 * 2. Create a fraud rule definition with isEnabled=false.
 * 3. Fetch the rule by ruleCode from the detail endpoint and assert it is returned
 *    and marked as disabled.
 * 4. Update the same rule to isEnabled=true (and optionally tweak another field
 *    such as the name to confirm updates are applied).
 * 5. Fetch the rule again and assert the isEnabled flag (and updated field)
 *    reflect the new state.
 */
export async function test_api_fraud_rule_definition_detail_inactive_rule_visibility(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to establish authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a fraud rule definition with isEnabled=false.
  const initialRuleCode: string = `RULE_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    ruleCode: initialRuleCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    scope: "order",
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    ruleExpression: '{"threshold": 1000, "metric": "order_amount"}',
    isEnabled: false,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const created: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic sanity checks on created rule.
  TestValidator.equals(
    "created.ruleCode matches requested ruleCode",
    created.ruleCode,
    initialRuleCode,
  );
  TestValidator.equals(
    "created.isEnabled should be false",
    created.isEnabled,
    false,
  );

  // 3. Fetch the rule by ruleCode from detail endpoint and assert it is disabled.
  const detailDisabled: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at(
      connection,
      {
        ruleCode: initialRuleCode,
      },
    );
  typia.assert(detailDisabled);

  TestValidator.equals(
    "detailDisabled.ruleCode matches created.ruleCode",
    detailDisabled.ruleCode,
    created.ruleCode,
  );
  TestValidator.equals(
    "detailDisabled.isEnabled remains false",
    detailDisabled.isEnabled,
    false,
  );

  // 4. Update the same rule to isEnabled=true (and change the name to confirm update propagation).
  const updatedName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });

  const updateBody = {
    isEnabled: true,
    name: updatedName,
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  const updated: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
      connection,
      {
        ruleCode: initialRuleCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  TestValidator.equals(
    "updated.isEnabled should be true",
    updated.isEnabled,
    true,
  );
  TestValidator.equals(
    "updated.name reflects new value",
    updated.name,
    updatedName,
  );

  // 5. Fetch the rule again and assert the isEnabled flag and updated name reflect new state.
  const detailEnabled: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at(
      connection,
      {
        ruleCode: initialRuleCode,
      },
    );
  typia.assert(detailEnabled);

  TestValidator.equals(
    "detailEnabled.ruleCode matches initial",
    detailEnabled.ruleCode,
    initialRuleCode,
  );
  TestValidator.equals(
    "detailEnabled.isEnabled is true after update",
    detailEnabled.isEnabled,
    true,
  );
  TestValidator.equals(
    "detailEnabled.name matches updated name",
    detailEnabled.name,
    updatedName,
  );
}
