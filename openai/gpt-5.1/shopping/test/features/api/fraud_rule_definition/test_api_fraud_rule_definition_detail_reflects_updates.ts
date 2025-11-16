import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_fraud_rule_definition_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // Make ip nullable to exercise optional field; href/referrer must be valid URIs
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create initial fraud rule definition
  const baseRuleCode = `E2E_RULE_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    ruleCode: baseRuleCode,
    name: `Initial ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    scope: "order",
    severity: "medium",
    ruleExpression: JSON.stringify({
      field: "order.totalAmount",
      op: ">",
      value: 100000,
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
  typia.assert<IShoppingMallFraudRuleDefinition>(created);

  // 3. Update certain mutable fields (partial update)
  const updatedSeverity = "high";
  const updatedIsEnabled = false;
  const updatedRuleExpression = JSON.stringify({
    anyOf: [
      { field: "order.totalAmount", op: ">", value: 200000 },
      { field: "order.refundRate", op: ">", value: 0.5 },
    ],
  });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });

  const updateBody = {
    // Do not send name/scope to ensure they remain unchanged
    description: updatedDescription,
    severity: updatedSeverity,
    ruleExpression: updatedRuleExpression,
    isEnabled: updatedIsEnabled,
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  const updated: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
      connection,
      {
        ruleCode: created.ruleCode,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(updated);

  // 4. Fetch detail after update
  const detail: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at(
      connection,
      {
        ruleCode: created.ruleCode,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(detail);

  // 5. Assertions
  // 5.1 Immutable identifiers are preserved
  TestValidator.equals(
    "fraud rule id remains immutable after update",
    detail.id,
    created.id,
  );
  TestValidator.equals(
    "fraud rule ruleCode remains immutable after update",
    detail.ruleCode,
    created.ruleCode,
  );

  // 5.2 Updated fields reflect latest values
  TestValidator.equals(
    "severity in detail matches updated severity",
    detail.severity,
    updatedSeverity,
  );
  TestValidator.equals(
    "isEnabled in detail matches updated flag",
    detail.isEnabled,
    updatedIsEnabled,
  );
  TestValidator.equals(
    "condition in detail matches updated ruleExpression mapping",
    detail.condition,
    updatedRuleExpression,
  );
  TestValidator.equals(
    "description in detail matches updated description",
    detail.description ?? null,
    updatedDescription,
  );

  // 5.3 Unchanged fields remain unchanged (name, scope)
  TestValidator.equals(
    "name remains unchanged when not included in update payload",
    detail.name,
    created.name,
  );
  TestValidator.equals(
    "scope remains unchanged when not included in update payload",
    detail.scope,
    created.scope,
  );

  // 5.4 createdAt is immutable, updatedAt has advanced and matches updated record
  TestValidator.equals(
    "createdAt is immutable between create and subsequent detail fetch",
    detail.createdAt,
    created.createdAt,
  );
  TestValidator.notEquals(
    "updatedAt changes after updating fraud rule definition",
    detail.updatedAt,
    created.updatedAt,
  );
  TestValidator.equals(
    "detail updatedAt matches updated response updatedAt",
    detail.updatedAt,
    updated.updatedAt,
  );

  // Lexicographical comparison is valid for ISO 8601 UTC strings
  TestValidator.predicate(
    "updatedAt is later than createdAt (lexicographical comparison of ISO 8601)",
    detail.updatedAt > created.updatedAt,
  );

  // 5.5 Consistency between updated and detail for all mutable properties
  TestValidator.equals(
    "detail and updated responses are aligned for name",
    detail.name,
    updated.name,
  );
  TestValidator.equals(
    "detail and updated responses are aligned for description",
    detail.description ?? null,
    updated.description ?? null,
  );
  TestValidator.equals(
    "detail and updated responses are aligned for scope",
    detail.scope,
    updated.scope,
  );
  TestValidator.equals(
    "detail and updated responses are aligned for severity",
    detail.severity,
    updated.severity,
  );
  TestValidator.equals(
    "detail and updated responses are aligned for isEnabled",
    detail.isEnabled,
    updated.isEnabled,
  );
  TestValidator.equals(
    "detail and updated responses are aligned for condition",
    detail.condition,
    updated.condition,
  );
}
