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

export async function test_api_business_rules_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register administrator account
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
    },
  });
  typia.assert(administrator);
  // Create business rule with valid configuration
  const configurationJson = JSON.stringify({
    minimum_amount: 10000,
    currency: "KRW",
    validation_message: "주문 최소 금액은 10,000원 이상이어야 합니다.",
  });
  const businessRule =
    await generate_random_ecommerce_administrator_business_rules_create(
      adminConnection,
      {
        body: {
          rule_code: "MIN_ORDER_AMOUNT",
          rule_name: "Minimum Order Amount Validation",
          rule_description:
            "Validates that order amount meets minimum requirement",
          rule_type: "validation",
          configuration_json: configurationJson,
          execution_order: 1,
        } satisfies IEcommercePlatformEventOfCustomer.ICreate,
      },
    );
  typia.assert(businessRule);
  // Validate response matches input parameters
  TestValidator.equals(
    "rule_code matches input",
    businessRule.rule_code,
    "MIN_ORDER_AMOUNT",
  );
  TestValidator.equals(
    "rule_name matches input",
    businessRule.rule_name,
    "Minimum Order Amount Validation",
  );
  TestValidator.equals(
    "rule_description matches input",
    businessRule.rule_description,
    "Validates that order amount meets minimum requirement",
  );
  TestValidator.equals(
    "rule_type matches input",
    businessRule.rule_type,
    "validation",
  );
  TestValidator.equals(
    "configuration_json matches input",
    businessRule.configuration_json,
    configurationJson,
  );
  // Validate business logic (not type validation)
  TestValidator.equals(
    "is_active defaults to true",
    businessRule.is_active,
    true,
  );
  TestValidator.equals(
    "execution_order matches input",
    businessRule.execution_order,
    1,
  );
}
