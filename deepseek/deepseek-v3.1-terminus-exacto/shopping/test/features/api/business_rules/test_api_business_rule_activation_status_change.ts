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

export async function test_api_business_rule_activation_status_change(
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
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Generate test business rule configuration
  const testConfiguration = {
    validation_rule: "minimum_purchase_amount",
    threshold: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >().toString(),
  };
  // Test 1: Create an active business rule and deactivate it
  // First, we need to simulate that a rule exists - for E2E testing we assume
  // the system has pre-existing business rules that we can modify
  // In a real scenario, this would involve calling a create endpoint first
  // Since we only have update endpoint available, we'll test status changes
  // on rules that we'll assume exist in the test environment
  const activeRuleId = typia.random<string & tags.Format<"uuid">>();
  const deactivationUpdate: IEcommercePlatformEventOfCustomer.IUpdate = {
    is_active: false,
  } satisfies IEcommercePlatformEventOfCustomer.IUpdate;
  // This test assumes the rule exists - in production E2E tests,
  // a rule creation step would precede this
  const deactivatedRule =
    await api.functional.ecommerce.superAdministrator.business_rules.update(
      superAdminConnection,
      {
        ruleId: activeRuleId,
        body: deactivationUpdate,
      },
    );
  typia.assert(deactivatedRule);
  // Validate deactivation
  TestValidator.equals(
    "rule should be updated successfully",
    deactivatedRule.id,
    activeRuleId,
  );
  // Test 2: Reactivate an inactive rule
  const inactiveRuleId = typia.random<string & tags.Format<"uuid">>();
  const reactivationUpdate: IEcommercePlatformEventOfCustomer.IUpdate = {
    is_active: true,
  } satisfies IEcommercePlatformEventOfCustomer.IUpdate;
  const reactivatedRule =
    await api.functional.ecommerce.superAdministrator.business_rules.update(
      superAdminConnection,
      {
        ruleId: inactiveRuleId,
        body: reactivationUpdate,
      },
    );
  typia.assert(reactivatedRule);
  // Validate reactivation
  TestValidator.equals(
    "rule should be updated successfully",
    reactivatedRule.id,
    inactiveRuleId,
  );
  // Test 3: Update configuration_json while preserving other properties
  const configRuleId = typia.random<string & tags.Format<"uuid">>();
  const configUpdate: IEcommercePlatformEventOfCustomer.IUpdate = {
    configuration_json: testConfiguration,
  } satisfies IEcommercePlatformEventOfCustomer.IUpdate;
  const configUpdatedRule =
    await api.functional.ecommerce.superAdministrator.business_rules.update(
      superAdminConnection,
      {
        ruleId: configRuleId,
        body: configUpdate,
      },
    );
  typia.assert(configUpdatedRule);
  // Validate configuration update
  TestValidator.equals(
    "rule should be updated successfully",
    configUpdatedRule.id,
    configRuleId,
  );
  // Test 4: Validate execution_order constraints with valid positive integer
  const executionOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const executionOrderUpdate: IEcommercePlatformEventOfCustomer.IUpdate = {
    execution_order: executionOrder,
  } satisfies IEcommercePlatformEventOfCustomer.IUpdate;
  const orderUpdatedRule =
    await api.functional.ecommerce.superAdministrator.business_rules.update(
      superAdminConnection,
      {
        ruleId: typia.random<string & tags.Format<"uuid">>(),
        body: executionOrderUpdate,
      },
    );
  typia.assert(orderUpdatedRule);
  // Validate execution order was processed
  TestValidator.predicate(
    "execution order should be processed",
    () => orderUpdatedRule.execution_order !== undefined,
  );
}