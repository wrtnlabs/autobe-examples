import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_business_rules_create } from "../../../generate/generate_random_ecommerce_super_administrator_business_rules_create";
import { prepare_random_ecommerce_platform_event_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_event_of_customer";

export async function test_api_business_rule_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  const authorizedAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(authorizedAdmin);
  // Create a business rule using the generation utility function
  const createdRule =
    await generate_random_ecommerce_super_administrator_business_rules_create(
      superAdminConnection,
      {
        body: {
          rule_code: RandomGenerator.alphaNumeric(10),
          rule_name: RandomGenerator.paragraph({ sentences: 2 }),
          rule_description: RandomGenerator.paragraph({ sentences: 3 }),
          rule_type: "validation",
          configuration_json: JSON.stringify({
            min: 0,
            max: 100,
            required: true,
          }),
          is_active: true,
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          version: "1.0.0",
        } satisfies IEcommercePlatformEventOfCustomer.ICreate,
      },
    );
  typia.assert(createdRule);
  // Retrieve the business rule by its ID
  const retrievedRule =
    await api.functional.ecommerce.superAdministrator.business_rules.at(
      superAdminConnection,
      {
        ruleId: createdRule.id,
      },
    );
  typia.assert(retrievedRule);
  // Validate all expected fields match the created data
  TestValidator.equals("id matches", retrievedRule.id, createdRule.id);
  TestValidator.equals(
    "rule_code matches",
    retrievedRule.rule_code,
    createdRule.rule_code,
  );
  TestValidator.equals(
    "rule_name matches",
    retrievedRule.rule_name,
    createdRule.rule_name,
  );
  TestValidator.equals(
    "rule_description matches",
    retrievedRule.rule_description,
    createdRule.rule_description,
  );
  TestValidator.equals(
    "rule_type matches",
    retrievedRule.rule_type,
    createdRule.rule_type,
  );
  TestValidator.equals(
    "configuration_json matches",
    retrievedRule.configuration_json,
    createdRule.configuration_json,
  );
  TestValidator.equals("is_active", retrievedRule.is_active, true);
  TestValidator.equals(
    "execution_order matches",
    retrievedRule.execution_order,
    createdRule.execution_order,
  );
  TestValidator.equals(
    "version matches",
    retrievedRule.version,
    createdRule.version,
  );
  TestValidator.equals(
    "deleted_at is null for active rule",
    retrievedRule.deleted_at,
    null,
  );
}
