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

/**
 * Test successful creation of a new business rule by a super administrator.
 * Verifies that properly formatted business rule data is accepted and creates
 * a complete business rule entity with system-generated fields and defaults.
 */
export async function test_api_business_rule_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Prepare business rule creation data
  const ruleTypes = [
    "validation",
    "workflow",
    "calculation",
    "restriction",
  ] as const;
  const createData = {
    rule_code: RandomGenerator.alphaNumeric(10),
    rule_name: RandomGenerator.name(3),
    rule_description: RandomGenerator.paragraph({ sentences: 2 }),
    rule_type: RandomGenerator.pick(ruleTypes),
    configuration_json: JSON.stringify({
      enabled: true,
      conditions: [
        {
          type: "value_check",
          field: "amount",
          operator: "greater_than",
          value: 0,
        },
      ],
      actions: [{ type: "approve", message: "Validation passed" }],
    }),
    is_active: true,
    execution_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    version: "1.0.0",
  } satisfies IEcommercePlatformEventOfCustomer.ICreate;
  // 3. Create business rule
  const businessRule =
    await api.functional.ecommerce.superAdministrator.business_rules.create(
      adminConnection,
      { body: createData },
    );
  typia.assert(businessRule);
  // 4. Validate response structure and data integrity
  TestValidator.equals(
    "rule_code matches",
    businessRule.rule_code,
    createData.rule_code,
  );
  TestValidator.equals(
    "rule_name matches",
    businessRule.rule_name,
    createData.rule_name,
  );
  TestValidator.equals(
    "rule_description matches",
    businessRule.rule_description,
    createData.rule_description,
  );
  TestValidator.equals(
    "rule_type matches",
    businessRule.rule_type,
    createData.rule_type,
  );
  TestValidator.predicate(
    "configuration_json matches",
    businessRule.configuration_json === createData.configuration_json,
  );
  TestValidator.predicate(
    "is_active defaults to true",
    businessRule.is_active === true,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    new Date(businessRule.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    new Date(businessRule.updated_at) instanceof Date,
  );
  TestValidator.predicate(
    "deleted_at is null",
    businessRule.deleted_at === null,
  );
  TestValidator.predicate(
    "execution_order is valid",
    businessRule.execution_order >= 0,
  );
  TestValidator.predicate("version is set", businessRule.version.length > 0);
}
