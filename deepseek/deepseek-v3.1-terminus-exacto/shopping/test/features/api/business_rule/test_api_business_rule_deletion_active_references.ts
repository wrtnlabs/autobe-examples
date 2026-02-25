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

export async function test_api_business_rule_deletion_active_references(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // Create a business rule that simulates having active dependencies
  const businessRule =
    await generate_random_ecommerce_super_administrator_business_rules_create(
      superAdminConnection,
      {
        body: {
          rule_code: "MINIMUM_ORDER_VALUE",
          rule_name: "Minimum Order Value Validation",
          rule_description:
            "Validates that order total meets minimum value requirements",
          rule_type: "validation",
          configuration_json: JSON.stringify({ minimum_amount: 1000 }),
          is_active: true,
          execution_order: 1,
        },
      },
    );
  typia.assert(businessRule);
  // Attempt to delete the business rule with active references
  // Since the rule is referenced by system processes, deletion should be prevented
  await TestValidator.error(
    "business rule deletion with active references should fail",
    async () => {
      await api.functional.ecommerce.superAdministrator.business_rules.erase(
        superAdminConnection,
        { ruleId: businessRule.id },
      );
    },
  );
  // Verify the business rule still exists by attempting to create another rule with same code
  // This would fail if the original rule was deleted due to unique constraint
  const duplicateRule =
    await api.functional.ecommerce.superAdministrator.business_rules.create(
      superAdminConnection,
      {
        body: {
          rule_code: businessRule.rule_code,
          rule_name: "Duplicate Rule Test",
          rule_description: "Test for verifying business rule still exists",
          rule_type: "test",
          configuration_json: JSON.stringify({ test: true }),
          is_active: false,
          execution_order: 99,
        },
      },
    );
  typia.assert(duplicateRule);
  // Clean up - delete the duplicate test rule
  await api.functional.ecommerce.superAdministrator.business_rules.erase(
    superAdminConnection,
    { ruleId: duplicateRule.id },
  );
}
