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

export async function test_api_business_rule_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // 2. Create a business rule to delete
  const businessRule =
    await generate_random_ecommerce_super_administrator_business_rules_create(
      superAdminConnection,
      {
        body: {
          rule_code: RandomGenerator.alphaNumeric(10),
          rule_name: RandomGenerator.paragraph({ sentences: 2 }),
          rule_description: RandomGenerator.paragraph({ sentences: 4 }),
          rule_type: "validation",
          configuration_json: JSON.stringify({ minLength: 5, maxLength: 100 }),
          is_active: true,
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommercePlatformEventOfCustomer.ICreate,
      },
    );
  typia.assert(businessRule);
  // 3. Execute deletion
  await api.functional.ecommerce.superAdministrator.business_rules.erase(
    superAdminConnection,
    {
      ruleId: businessRule.id,
    },
  );
  // 4. Verify deletion by attempting to retrieve the deleted rule (should error)
  await TestValidator.error("deleted rule retrieval should fail", async () => {
    await api.functional.ecommerce.superAdministrator.business_rules.erase(
      superAdminConnection,
      {
        ruleId: businessRule.id,
      },
    );
  });
}
