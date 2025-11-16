import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate partial update behavior of fraud rule definitions for platform
 * admins.
 *
 * Business goal: Ensure that a platform administrator can update only selected
 * mutable attributes of an existing fraud rule definition (specifically `scope`
 * and `severity`) using the update endpoint addressed by `ruleCode`, without
 * unintentionally resetting or nulling other fields.
 *
 * Scenario outline:
 *
 * 1. Establish an authorized platform admin session using POST
 *    /auth/platformAdmin/join.
 * 2. Create a baseline fraud rule definition using POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions with known values for all
 *    important fields.
 * 3. Perform a partial update using PUT
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions/{ruleCode}, providing
 *    only `scope` and `severity` in the
 *    IShoppingMallFraudRuleDefinition.IUpdate body.
 * 4. Validate that the response reflects the updated `scope` and `severity`, while
 *    all other attributes (id, ruleCode, name, description,
 *    ruleExpression/condition, isEnabled, createdAt) remain consistent with the
 *    originally created entity, aside from `updatedAt` which is expected to
 *    change.
 *
 * Constraints and DTO usage:
 *
 * - Use IShoppingMallPlatformAdminJoin.IRequest for the join request body.
 * - Use IShoppingMallFraudRuleDefinition.ICreate for the create request body.
 * - Use IShoppingMallFraudRuleDefinition.IUpdate for the update request body.
 * - All request body objects must be created with `satisfies` against the
 *   corresponding DTO type (no `as` assertions).
 * - Only use DTO properties defined in the provided types.
 *
 * Assertions:
 *
 * - Typia.assert on each non-void API response to guarantee schema conformity.
 * - Use TestValidator.equals/TestValidator.notEquals/TestValidator.predicate with
 *   descriptive titles for business logic checks:
 *
 *   - Updated `scope` and `severity` equal the new values sent in the update.
 *   - `id` and `ruleCode` are unchanged between create and update responses.
 *   - `name`, `description`, `isEnabled`, and `condition` (ruleExpression mapped
 *       field) are unchanged between create and update responses.
 *   - `updatedAt` differs between create and update responses to reflect the
 *       modification.
 *
 * Implementation notes:
 *
 * - Generate realistic but simple values using RandomGenerator and typia.random
 *   where formats are constrained (for email, UUID, etc.).
 * - Keep the test self-contained: it should fully set up its own data using the
 *   join and create endpoints and rely solely on the SDK functions provided.
 */
export async function test_api_fraud_rule_definition_partial_update_scope_and_severity(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a baseline fraud rule definition with known values.
  const baseRuleCode = `RULE_${RandomGenerator.alphaNumeric(8)}`;
  const baseScope = "order";
  const baseSeverity = "medium";

  const createBody = {
    ruleCode: baseRuleCode,
    name: "High refund rate within 7 days",
    description:
      "Flags customers who refund more than 3 orders within 7 days as potential fraud.",
    scope: baseScope,
    severity: baseSeverity,
    ruleExpression: JSON.stringify({
      metric: "refund_count_7d",
      operator: ">",
      threshold: 3,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const created: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic sanity assertions on the created rule
  TestValidator.equals(
    "created ruleCode should match request",
    created.ruleCode,
    baseRuleCode,
  );
  TestValidator.equals(
    "created scope should match request",
    created.scope,
    baseScope,
  );
  TestValidator.equals(
    "created severity should match request",
    created.severity,
    baseSeverity,
  );
  TestValidator.equals(
    "created name should match request",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created description should match request",
    created.description,
    createBody.description ?? undefined,
  );
  TestValidator.equals(
    "created condition should match ruleExpression",
    created.condition,
    createBody.ruleExpression,
  );
  TestValidator.equals(
    "created isEnabled should match request",
    created.isEnabled,
    createBody.isEnabled,
  );

  // 3. Perform partial update: only scope and severity.
  const updatedScope = "payment";
  const updatedSeverity = "high";

  const updateBody = {
    scope: updatedScope,
    severity: updatedSeverity,
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  const updated: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
      connection,
      {
        ruleCode: created.ruleCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Business assertions: only specified fields changed.
  // 4-1. Updated fields reflect new values.
  TestValidator.equals(
    "updated scope should reflect new value",
    updated.scope,
    updatedScope,
  );
  TestValidator.equals(
    "updated severity should reflect new value",
    updated.severity,
    updatedSeverity,
  );

  // 4-2. Immutable identifiers remain unchanged.
  TestValidator.equals(
    "id must remain unchanged after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "ruleCode must remain unchanged after update",
    updated.ruleCode,
    created.ruleCode,
  );

  // 4-3. Other fields remain intact.
  TestValidator.equals(
    "name should remain unchanged after partial update",
    updated.name,
    created.name,
  );
  TestValidator.equals(
    "description should remain unchanged after partial update",
    updated.description,
    created.description,
  );
  TestValidator.equals(
    "condition (ruleExpression) should remain unchanged after partial update",
    updated.condition,
    created.condition,
  );
  TestValidator.equals(
    "isEnabled should remain unchanged after partial update",
    updated.isEnabled,
    created.isEnabled,
  );

  // 4-4. Lifecycle timestamps: createdAt same, updatedAt changed.
  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updated.createdAt,
    created.createdAt,
  );
  TestValidator.notEquals(
    "updatedAt should change after update",
    updated.updatedAt,
    created.updatedAt,
  );
}
