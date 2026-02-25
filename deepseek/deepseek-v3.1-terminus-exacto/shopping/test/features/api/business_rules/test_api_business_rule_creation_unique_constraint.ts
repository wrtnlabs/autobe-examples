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

export async function test_api_business_rule_creation_unique_constraint(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {});
  // Generate a unique rule_code for testing
  const ruleCode = typia.random<string & tags.Format<"uuid">>();
  // Prepare business rule creation data
  const body = {
    rule_code: ruleCode,
    rule_name: RandomGenerator.paragraph({ sentences: 2 }),
    rule_description: RandomGenerator.content({ paragraphs: 1 }),
    rule_type: "validation",
    configuration_json: JSON.stringify({ maxRetries: 3 }),
    is_active: true,
    execution_order: 0 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0> as number satisfies number | null | undefined,
    version: "1.0.0",
  } satisfies IEcommercePlatformEventOfCustomer.ICreate;
  // Create the first business rule using utility function
  const firstRule =
    await generate_random_ecommerce_super_administrator_business_rules_create(
      adminConnection,
      { body },
    );
  typia.assert(firstRule);
  // Validate the created rule matches input
  TestValidator.equals("rule_code matches", firstRule.rule_code, ruleCode);
  TestValidator.equals(
    "rule_name matches",
    firstRule.rule_name,
    body.rule_name,
  );
  // Attempt to create duplicate rule with same rule_code
  await TestValidator.error(
    "duplicate rule_code should be rejected",
    async () => {
      const duplicateBody = {
        ...body,
        rule_name: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommercePlatformEventOfCustomer.ICreate;
      // Use utility function for duplicate creation attempt
      await generate_random_ecommerce_super_administrator_business_rules_create(
        adminConnection,
        { body: duplicateBody },
      );
    },
  );
}
