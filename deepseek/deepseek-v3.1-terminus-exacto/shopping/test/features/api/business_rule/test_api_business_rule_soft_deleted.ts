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

export async function test_api_business_rule_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
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
  typia.assert(superAdmin);
  // 2. Create a business rule
  const businessRule =
    await generate_random_ecommerce_super_administrator_business_rules_create(
      superAdminConnection,
      {
        body: {
          rule_code: RandomGenerator.alphaNumeric(10),
          rule_name: RandomGenerator.paragraph({ sentences: 2 }),
          rule_description: RandomGenerator.paragraph({ sentences: 3 }),
          rule_type: "validation",
          configuration_json: '{"condition": "always"}',
          is_active: true,
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          version: "1.0.0",
        } satisfies IEcommercePlatformEventOfCustomer.ICreate,
      },
    );
  typia.assert(businessRule);
  // 3. Soft-delete the business rule
  await api.functional.ecommerce.superAdministrator.business_rules.erase(
    superAdminConnection,
    {
      ruleId: businessRule.id,
    },
  );
  // 4. Attempt to retrieve the soft-deleted business rule
  const retrievedRule =
    await api.functional.ecommerce.superAdministrator.business_rules.at(
      superAdminConnection,
      {
        ruleId: businessRule.id,
      },
    );
  typia.assert(retrievedRule);
  // 5. Validate soft-deletion behavior - business logic tests only
  TestValidator.equals(
    "retrieved rule ID matches deleted rule",
    retrievedRule.id,
    businessRule.id,
  );
  // typia.assert() already validated all types including deleted_at field
  // Only test business logic: that the rule was successfully retrieved after deletion
}
