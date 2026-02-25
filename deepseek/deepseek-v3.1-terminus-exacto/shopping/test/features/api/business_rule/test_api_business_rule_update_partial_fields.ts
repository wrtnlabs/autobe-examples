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

export async function test_api_business_rule_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator using provided utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(auth);
  // Generate a rule ID and test partial update functionality
  const ruleId = typia.random<string & tags.Format<"uuid">>();
  // Test that partial updates are accepted (only update selected fields)
  const partialUpdateBody: IEcommercePlatformEventOfCustomer.IUpdate = {
    rule_name: "Partial Update Test Rule",
    rule_description: "Testing partial field updates",
    execution_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    version: "1.5.0",
  };
  const result =
    await api.functional.ecommerce.superAdministrator.business_rules.update(
      superAdminConnection,
      {
        ruleId: ruleId,
        body: partialUpdateBody,
      },
    );
  typia.assert(result);
  // Validate the response has the expected structure
  TestValidator.equals("rule ID matches", result.id, ruleId);
  TestValidator.equals(
    "rule_name updated",
    result.rule_name,
    "Partial Update Test Rule",
  );
  TestValidator.equals(
    "rule_description updated",
    result.rule_description,
    "Testing partial field updates",
  );
  TestValidator.equals(
    "execution_order updated",
    result.execution_order,
    partialUpdateBody.execution_order,
  );
  TestValidator.equals("version updated", result.version, "1.5.0");
  // Validate that other fields have reasonable default values
  TestValidator.predicate("rule_code is present", result.rule_code.length > 0);
  TestValidator.predicate("rule_type is present", result.rule_type.length > 0);
  TestValidator.predicate(
    "configuration_json is present",
    result.configuration_json.length > 0,
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof result.is_active === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    Date.parse(result.created_at) > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    Date.parse(result.updated_at) > 0,
  );
  TestValidator.equals("deleted_at is null", result.deleted_at, null);
  // Test that empty partial update (only rule_name) is also accepted
  const minimalUpdateBody: IEcommercePlatformEventOfCustomer.IUpdate = {
    rule_name: "Minimal Update",
  };
  const minimalResult =
    await api.functional.ecommerce.superAdministrator.business_rules.update(
      superAdminConnection,
      {
        ruleId: ruleId,
        body: minimalUpdateBody,
      },
    );
  typia.assert(minimalResult);
  // Validate minimal update was processed
  TestValidator.equals(
    "minimal update rule_name accepted",
    minimalResult.rule_name,
    "Minimal Update",
  );
}
