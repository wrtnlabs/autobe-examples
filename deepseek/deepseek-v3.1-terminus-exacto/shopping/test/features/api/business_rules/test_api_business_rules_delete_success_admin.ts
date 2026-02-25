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

export async function test_api_business_rules_delete_success_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123" + RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(admin);
  // 2. Create a business rule
  const businessRule =
    await generate_random_ecommerce_administrator_business_rules_create(
      adminConnection,
      {
        body: {
          rule_code: "TEST_RULE_" + RandomGenerator.alphaNumeric(10),
          rule_name: RandomGenerator.paragraph({ sentences: 2 }),
          rule_description: RandomGenerator.content({ paragraphs: 1 }),
          rule_type: "validation",
          configuration_json: JSON.stringify({ enabled: true, threshold: 50 }),
          is_active: true,
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          version: "1.0.0",
        },
      },
    );
  typia.assert(businessRule);
  // 3. Verify rule exists before deletion (deleted_at should be null)
  TestValidator.equals(
    "deleted_at should be null before deletion",
    businessRule.deleted_at,
    null,
  );
  // 4. Soft delete the business rule
  await api.functional.ecommerce.administrator.business_rules.erase(
    adminConnection,
    {
      ruleId: businessRule.id,
    },
  );
  // 5. The successful completion of the delete operation without errors
  // indicates that the soft deletion was processed correctly
  // Since no retrieve endpoint is available in the current API,
  // we rely on the absence of HTTP errors to validate success
  // 6. Test attempting to delete already deleted rule should succeed (idempotent)
  await api.functional.ecommerce.administrator.business_rules.erase(
    adminConnection,
    {
      ruleId: businessRule.id,
    },
  );
}
