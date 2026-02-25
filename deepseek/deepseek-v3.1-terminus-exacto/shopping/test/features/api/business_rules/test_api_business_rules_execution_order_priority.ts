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

export async function test_api_business_rules_execution_order_priority(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator - use authorize utility function
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create new connection with updated authorization headers
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: admin.token.access },
  };
  // Create first business rule with execution order 0 (minimum)
  const rule1Body = {
    rule_code: RandomGenerator.alphaNumeric(8),
    rule_name: RandomGenerator.paragraph({ sentences: 2 }),
    rule_description: RandomGenerator.paragraph({ sentences: 3 }),
    rule_type: "validation",
    configuration_json: JSON.stringify({ priority: "high", enabled: true }),
    is_active: true,
    execution_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<0>
    >(),
  } satisfies IEcommercePlatformEventOfCustomer.ICreate;
  const rule1 =
    await generate_random_ecommerce_administrator_business_rules_create(
      adminConnection,
      { body: rule1Body },
    );
  typia.assert(rule1);
  TestValidator.equals("initial execution order 1", rule1.execution_order, 0);
  // Create second business rule with execution order 5
  const rule2Body = {
    rule_code: RandomGenerator.alphaNumeric(8),
    rule_name: RandomGenerator.paragraph({ sentences: 2 }),
    rule_description: RandomGenerator.paragraph({ sentences: 3 }),
    rule_type: "workflow",
    configuration_json: JSON.stringify({ priority: "medium", enabled: true }),
    is_active: true,
    execution_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<5>
    >(),
  } satisfies IEcommercePlatformEventOfCustomer.ICreate;
  const rule2 =
    await generate_random_ecommerce_administrator_business_rules_create(
      adminConnection,
      { body: rule2Body },
    );
  typia.assert(rule2);
  TestValidator.equals("initial execution order 2", rule2.execution_order, 5);
  // Retrieve initial rules to verify configuration
  const initialRule1 =
    await api.functional.ecommerce.administrator.business_rules.at(
      adminConnection,
      { ruleId: rule1.id },
    );
  typia.assert(initialRule1);
  const initialRule2 =
    await api.functional.ecommerce.administrator.business_rules.at(
      adminConnection,
      { ruleId: rule2.id },
    );
  typia.assert(initialRule2);
  // Swap execution orders
  const updatedRule1 =
    await api.functional.ecommerce.administrator.business_rules.update(
      adminConnection,
      {
        ruleId: rule1.id,
        body: {
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<10>
          >(),
        } satisfies IEcommercePlatformEventOfCustomer.IUpdate,
      },
    );
  typia.assert(updatedRule1);
  TestValidator.equals(
    "rule 1 updated execution order",
    updatedRule1.execution_order,
    10,
  );
  TestValidator.equals(
    "rule 1 code unchanged",
    updatedRule1.rule_code,
    rule1.rule_code,
  );
  TestValidator.equals(
    "rule 1 config unchanged",
    updatedRule1.configuration_json,
    rule1.configuration_json,
  );
  const updatedRule2 =
    await api.functional.ecommerce.administrator.business_rules.update(
      adminConnection,
      {
        ruleId: rule2.id,
        body: {
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<0>
          >(),
        } satisfies IEcommercePlatformEventOfCustomer.IUpdate,
      },
    );
  typia.assert(updatedRule2);
  TestValidator.equals(
    "rule 2 updated execution order",
    updatedRule2.execution_order,
    0,
  );
  TestValidator.equals(
    "rule 2 code unchanged",
    updatedRule2.rule_code,
    rule2.rule_code,
  );
  TestValidator.equals(
    "rule 2 config unchanged",
    updatedRule2.configuration_json,
    rule2.configuration_json,
  );
  // Test edge case: set execution order to another high value
  const edgeCaseRule =
    await api.functional.ecommerce.administrator.business_rules.update(
      adminConnection,
      {
        ruleId: rule1.id,
        body: {
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<999> & tags.Maximum<999>
          >(),
        } satisfies IEcommercePlatformEventOfCustomer.IUpdate,
      },
    );
  typia.assert(edgeCaseRule);
  TestValidator.equals(
    "edge case execution order",
    edgeCaseRule.execution_order,
    999,
  );
  // Verify all rules remain functional after updates
  const finalRule1 =
    await api.functional.ecommerce.administrator.business_rules.at(
      adminConnection,
      { ruleId: rule1.id },
    );
  typia.assert(finalRule1);
  TestValidator.predicate("rule 1 remains active", finalRule1.is_active);
  const finalRule2 =
    await api.functional.ecommerce.administrator.business_rules.at(
      adminConnection,
      { ruleId: rule2.id },
    );
  typia.assert(finalRule2);
  TestValidator.predicate("rule 2 remains active", finalRule2.is_active);
}
