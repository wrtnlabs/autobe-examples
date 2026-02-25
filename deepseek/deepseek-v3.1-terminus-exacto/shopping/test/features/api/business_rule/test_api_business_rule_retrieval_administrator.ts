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

export async function test_api_business_rule_retrieval_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(administrator);
  // Create a sample business rule using SDK since no generation utility exists
  const createBody = {
    rule_code: RandomGenerator.alphaNumeric(10),
    rule_name: RandomGenerator.paragraph({ sentences: 2 }),
    rule_description: RandomGenerator.content({ paragraphs: 1 }),
    rule_type: "validation",
    configuration_json: JSON.stringify({ maxPrice: 1000, minQuantity: 1 }),
    is_active: true,
    execution_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    version: "1.0.0",
  } satisfies IEcommercePlatformEventOfCustomer.ICreate;
  const businessRule =
    await api.functional.ecommerce.administrator.business_rules.create(
      adminConnection,
      { body: createBody },
    );
  typia.assert(businessRule);
  // Retrieve the business rule by its ID
  const retrievedRule =
    await api.functional.ecommerce.administrator.business_rules.at(
      adminConnection,
      {
        ruleId: businessRule.id,
      },
    );
  typia.assert(retrievedRule);
  // Validate that the retrieved rule matches the created rule exactly
  TestValidator.equals("business rule ID", retrievedRule.id, businessRule.id);
  TestValidator.equals(
    "rule code",
    retrievedRule.rule_code,
    businessRule.rule_code,
  );
  TestValidator.equals(
    "rule name",
    retrievedRule.rule_name,
    businessRule.rule_name,
  );
  TestValidator.equals(
    "rule description",
    retrievedRule.rule_description,
    businessRule.rule_description,
  );
  TestValidator.equals(
    "rule type",
    retrievedRule.rule_type,
    businessRule.rule_type,
  );
  TestValidator.equals(
    "configuration JSON",
    retrievedRule.configuration_json,
    businessRule.configuration_json,
  );
  TestValidator.equals(
    "is active",
    retrievedRule.is_active,
    businessRule.is_active,
  );
  TestValidator.equals(
    "execution order",
    retrievedRule.execution_order,
    businessRule.execution_order,
  );
  TestValidator.equals("version", retrievedRule.version, businessRule.version);
  TestValidator.equals(
    "created at",
    retrievedRule.created_at,
    businessRule.created_at,
  );
  TestValidator.equals(
    "updated at",
    retrievedRule.updated_at,
    businessRule.updated_at,
  );
  TestValidator.equals(
    "deleted at",
    retrievedRule.deleted_at,
    businessRule.deleted_at,
  );
}
