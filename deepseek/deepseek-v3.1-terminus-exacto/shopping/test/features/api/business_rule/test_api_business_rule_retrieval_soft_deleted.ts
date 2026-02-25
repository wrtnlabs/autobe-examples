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

export async function test_api_business_rule_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Create a business rule
  const businessRule =
    await generate_random_ecommerce_administrator_business_rules_create(
      adminConnection,
      {},
    );
  typia.assert(businessRule);
  // Soft-delete the business rule
  await api.functional.ecommerce.administrator.business_rules.erase(
    adminConnection,
    {
      ruleId: businessRule.id,
    },
  );
  // Retrieve the soft-deleted business rule
  const retrievedRule =
    await api.functional.ecommerce.administrator.business_rules.at(
      adminConnection,
      {
        ruleId: businessRule.id,
      },
    );
  typia.assert(retrievedRule);
  // Validate that soft-deleted rule is accessible and contains deletion timestamp
  TestValidator.equals("rule ID matches", retrievedRule.id, businessRule.id);
  TestValidator.equals(
    "rule code matches",
    retrievedRule.rule_code,
    businessRule.rule_code,
  );
  TestValidator.notEquals(
    "deleted_at timestamp exists",
    retrievedRule.deleted_at,
    null,
  );
  TestValidator.predicate(
    "deleted_at is valid date string",
    retrievedRule.deleted_at !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedRule.deleted_at),
  );
}
