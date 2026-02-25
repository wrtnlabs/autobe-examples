import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_business_rules_create } from "../../../generate/generate_random_ecommerce_administrator_business_rules_create";
import { prepare_random_ecommerce_platform_event_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_event_of_customer";

export async function test_api_business_rules_activation_toggle(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create an initially active business rule
  const createBody = {
    rule_code: RandomGenerator.alphabets(10),
    rule_name: RandomGenerator.name(),
    rule_description: RandomGenerator.content({ paragraphs: 1 }),
    rule_type: "validation",
    configuration_json: JSON.stringify({ min_length: 5, max_length: 100 }),
    is_active: true,
    execution_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    version: "1.0.0",
  } satisfies IEcommercePlatformEventOfCustomer.ICreate;
  const createdRule =
    await generate_random_ecommerce_administrator_business_rules_create(
      adminConnection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRule);
  // Verify initial active state
  TestValidator.equals(
    "rule should be initially active",
    createdRule.is_active,
    true,
  );
  // Get the rule to confirm initial state
  const initialRule =
    await api.functional.ecommerce.administrator.business_rules.at(
      adminConnection,
      {
        ruleId: createdRule.id,
      },
    );
  typia.assert(initialRule);
  TestValidator.equals(
    "initial state matches creation",
    initialRule.is_active,
    true,
  );
  const originalExecutionOrder = initialRule.execution_order;
  const originalConfigJson = initialRule.configuration_json;
  // Update only the is_active field to false
  const deactivateBody = {
    is_active: false,
  } satisfies IEcommercePlatformEventOfCustomer.IUpdate;
  const deactivatedRule =
    await api.functional.ecommerce.administrator.business_rules.update(
      adminConnection,
      {
        ruleId: createdRule.id,
        body: deactivateBody,
      },
    );
  typia.assert(deactivatedRule);
  // Verify deactivation
  TestValidator.equals(
    "rule should be deactivated",
    deactivatedRule.is_active,
    false,
  );
  TestValidator.equals(
    "execution order should remain unchanged",
    deactivatedRule.execution_order,
    originalExecutionOrder,
  );
  TestValidator.equals(
    "config JSON should remain unchanged",
    deactivatedRule.configuration_json,
    originalConfigJson,
  );
  // Update only the is_active field to true again
  const reactivateBody = {
    is_active: true,
  } satisfies IEcommercePlatformEventOfCustomer.IUpdate;
  const reactivatedRule =
    await api.functional.ecommerce.administrator.business_rules.update(
      adminConnection,
      {
        ruleId: createdRule.id,
        body: reactivateBody,
      },
    );
  typia.assert(reactivatedRule);
  // Verify reactivation
  TestValidator.equals(
    "rule should be reactivated",
    reactivatedRule.is_active,
    true,
  );
  TestValidator.equals(
    "execution order should remain unchanged after reactivation",
    reactivatedRule.execution_order,
    originalExecutionOrder,
  );
  TestValidator.equals(
    "config JSON should remain unchanged after reactivation",
    reactivatedRule.configuration_json,
    originalConfigJson,
  );
  // Verify that no other properties were affected
  TestValidator.equals(
    "rule code unchanged",
    reactivatedRule.rule_code,
    createdRule.rule_code,
  );
  TestValidator.equals(
    "rule name unchanged",
    reactivatedRule.rule_name,
    createdRule.rule_name,
  );
  TestValidator.equals(
    "rule description unchanged",
    reactivatedRule.rule_description,
    createdRule.rule_description,
  );
  TestValidator.equals(
    "rule type unchanged",
    reactivatedRule.rule_type,
    createdRule.rule_type,
  );
  TestValidator.equals(
    "version unchanged",
    reactivatedRule.version,
    createdRule.version,
  );
}
