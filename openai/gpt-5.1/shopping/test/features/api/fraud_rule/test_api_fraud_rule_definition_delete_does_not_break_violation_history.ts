import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFraudRuleViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFraudRuleViolation";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallFraudRuleViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleViolation";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that deleting a fraud rule definition does not break access to
 * historical fraud rule violations.
 *
 * Business goals:
 *
 * - Deleting a rule definition by its business key `ruleCode` must NOT:
 *
 *   - Cascade delete historical fraud violations.
 *   - Break the fraudRuleViolations search endpoint.
 *   - Corrupt denormalized rule metadata embedded in violation summaries.
 *
 * Flow:
 *
 * 1. Join as a platform admin, establishing an authenticated connection.
 * 2. Create a new fraud rule definition with a unique ruleCode.
 * 3. Query fraudRuleViolations with a filter including that ruleCode and record
 *    the number of matching violations (may be zero in a clean environment).
 * 4. Delete the fraud rule definition via its ruleCode.
 * 5. Query fraudRuleViolations again with the same filter.
 * 6. Assert that:
 *
 *    - The second query still succeeds and returns a valid paginated structure.
 *    - The total count of violations after deletion is not less than before,
 *         ensuring the delete operation does not cascade.
 *    - If any violations referencing the rule exist after deletion, their embedded
 *         rule_definition.rule_code still equals the deleted ruleCode.
 */
export async function test_api_fraud_rule_definition_delete_does_not_break_violation_history(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized context.
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new fraud rule definition with a unique ruleCode.
  const uniqueSuffix = RandomGenerator.alphaNumeric(12);
  const ruleCode = `E2E_RULE_${uniqueSuffix}`;

  const createBody = {
    ruleCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: RandomGenerator.pick([
      "order",
      "payment",
      "customer_account",
      "seller_account",
      "session_activity",
    ] as const),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    ruleExpression: JSON.stringify({
      type: "threshold",
      field: "order.totalAmount",
      operator: ">",
      value: 100000,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const createdRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRule);

  TestValidator.equals(
    "created ruleCode matches requested",
    createdRule.ruleCode,
    ruleCode,
  );

  // Helper closure to perform a violation search for the given ruleCode.
  const searchViolationsByRuleCode =
    async (): Promise<IPageIShoppingMallFraudRuleViolation.ISummary> => {
      const body = {
        page: 1,
        limit: 50,
        ruleCodes: [ruleCode],
      } satisfies IShoppingMallFraudRuleViolation.IRequest;

      const pageResult: IPageIShoppingMallFraudRuleViolation.ISummary =
        await api.functional.shoppingMall.platformAdmin.fraudRuleViolations.index(
          connection,
          {
            body,
          },
        );
      typia.assert(pageResult);
      return pageResult;
    };

  // 3. Initial search before deletion.
  const beforePage = await searchViolationsByRuleCode();

  TestValidator.predicate(
    "before-deletion pagination.records is non-negative",
    beforePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "before-deletion pagination.pages is non-negative",
    beforePage.pagination.pages >= 0,
  );

  const beforeCount = beforePage.pagination.records;

  // 4. Delete the fraud rule definition.
  await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.erase(
    connection,
    {
      ruleCode,
    },
  );

  // 5. Search again after deletion.
  const afterPage = await searchViolationsByRuleCode();

  TestValidator.predicate(
    "after-deletion pagination.records is non-negative",
    afterPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "after-deletion pagination.pages is non-negative",
    afterPage.pagination.pages >= 0,
  );

  const afterCount = afterPage.pagination.records;

  // 6. Business validations around non-cascading behavior.
  TestValidator.predicate(
    "violation count after deletion is not less than before",
    afterCount >= beforeCount,
  );

  if (afterPage.data.length > 0) {
    for (const violation of afterPage.data) {
      // Ensure each violation carries rule_definition metadata with the
      // original rule_code even after the rule definition has been deleted.
      TestValidator.equals(
        "violation.rule_definition.rule_code still matches deleted ruleCode",
        violation.rule_definition.rule_code,
        ruleCode,
      );
    }
  }
}
