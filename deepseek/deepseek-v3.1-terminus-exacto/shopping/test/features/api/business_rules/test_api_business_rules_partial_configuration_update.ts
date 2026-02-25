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

export async function test_api_business_rules_partial_configuration_update(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Create initial business rule
  const initialRule =
    await generate_random_ecommerce_administrator_business_rules_create(
      adminConnection,
      {
        body: {
          rule_code: RandomGenerator.alphabets(10),
          rule_name: RandomGenerator.name(2),
          rule_description: RandomGenerator.paragraph({ sentences: 2 }),
          rule_type: "validation",
          configuration_json: JSON.stringify({
            minValue: "10",
            maxValue: "100",
            required: "true",
          }),
          is_active: true,
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          version: "1.0.0",
        } satisfies IEcommercePlatformEventOfCustomer.ICreate,
      },
    );
  typia.assert(initialRule);
  // Retrieve the created rule to verify initial state
  const retrievedRule =
    await api.functional.ecommerce.administrator.business_rules.at(
      adminConnection,
      { ruleId: initialRule.id },
    );
  typia.assert(retrievedRule);
  // Prepare partial update data
  const updateData = {
    rule_description: RandomGenerator.paragraph({ sentences: 3 }),
    configuration_json: {
      minValue: "20",
      maxValue: "200",
      required: "false",
      newField: "added",
    },
  } satisfies IEcommercePlatformEventOfCustomer.IUpdate;
  // Perform partial update
  const updatedRule =
    await api.functional.ecommerce.administrator.business_rules.update(
      adminConnection,
      {
        ruleId: initialRule.id,
        body: updateData,
      },
    );
  typia.assert(updatedRule);
  // Validate partial update results
  TestValidator.equals(
    "rule code should remain unchanged",
    updatedRule.rule_code,
    initialRule.rule_code,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedRule.created_at,
    initialRule.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be modified",
    updatedRule.updated_at,
    initialRule.updated_at,
  );
  TestValidator.equals(
    "rule description should be updated",
    updatedRule.rule_description,
    updateData.rule_description,
  );
  TestValidator.equals(
    "configuration JSON should be updated",
    updatedRule.configuration_json,
    JSON.stringify(updateData.configuration_json),
  );
  TestValidator.equals(
    "rule name should remain unchanged",
    updatedRule.rule_name,
    initialRule.rule_name,
  );
  TestValidator.equals(
    "rule type should remain unchanged",
    updatedRule.rule_type,
    initialRule.rule_type,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    updatedRule.is_active,
    initialRule.is_active,
  );
  TestValidator.equals(
    "execution_order should remain unchanged",
    updatedRule.execution_order,
    initialRule.execution_order,
  );
  TestValidator.equals(
    "version should remain unchanged",
    updatedRule.version,
    initialRule.version,
  );
}
