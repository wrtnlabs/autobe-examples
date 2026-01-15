import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_surcharge_rule_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Try to update an existing rule (assumed to exist in test environment)
  // We use a valid UUID as rule ID, assuming test environment has at least one rule
  const ruleId: string = typia.random<string & tags.Format<"uuid">>();
  // Update fields
  const paymentMethod = "credit_card";
  const region = "US";
  const applicableFrom = new Date().toISOString();
  const surchargePercentage = 2.5;
  const is_active = false;
  // Update the rule with valid data
  const updatedRule: IShoppingMallPaymentSurchargeRule =
    await api.functional.shoppingMall.admin.payment_surcharge_rules.update(
      adminConnection,
      {
        ruleId,
        body: {
          paymentMethod,
          region,
          applicableFrom,
          surchargePercentage,
          is_active,
        } satisfies IShoppingMallPaymentSurchargeRule.IUpdate,
      },
    );
  typia.assert(updatedRule);
  // Validate the updated rule has correct values and unchanged metadata
  TestValidator.equals(
    "updated paymentMethod matches",
    updatedRule.payment_method_id,
    ruleId,
  );
  TestValidator.equals("updated region matches", updatedRule.region_id, ruleId);
  TestValidator.equals(
    "updated applicable_from matches",
    updatedRule.applicable_from,
    applicableFrom,
  );
  TestValidator.equals(
    "updated surcharge_percentage matches",
    updatedRule.surcharge_percentage,
    surchargePercentage,
  );
  TestValidator.equals(
    "updated is_active matches",
    updatedRule.is_active,
    is_active,
  );
  TestValidator.equals("rule ID unchanged", updatedRule.id, ruleId);
  TestValidator.predicate(
    "createdAt unchanged",
    () => updatedRule.createdAt === updatedRule.createdAt,
  );
  TestValidator.predicate(
    "updatedAt updated",
    () => updatedRule.updatedAt > updatedRule.createdAt,
  );
  // Test error scenarios with invalid data
  // Negative surcharge percentage should fail
  await TestValidator.error(
    "negative surcharge percentage should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_surcharge_rules.update(
        adminConnection,
        {
          ruleId,
          body: {
            paymentMethod,
            region,
            applicableFrom,
            surchargePercentage: -1, // Invalid: negative value
            is_active,
          } satisfies IShoppingMallPaymentSurchargeRule.IUpdate,
        },
      );
    },
  );
  // Invalid date format should fail
  await TestValidator.error("invalid date format should fail", async () => {
    await api.functional.shoppingMall.admin.payment_surcharge_rules.update(
      adminConnection,
      {
        ruleId,
        body: {
          paymentMethod,
          region,
          applicableFrom: "invalid-date-format", // Invalid ISO format
          surchargePercentage,
          is_active,
        } satisfies IShoppingMallPaymentSurchargeRule.IUpdate,
      },
    );
  });
  // Surcharge percentage exceeds 100 should fail
  await TestValidator.error(
    "surcharge percentage over 100 should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_surcharge_rules.update(
        adminConnection,
        {
          ruleId,
          body: {
            paymentMethod,
            region,
            applicableFrom,
            surchargePercentage: 101, // Invalid: over 100
            is_active,
          } satisfies IShoppingMallPaymentSurchargeRule.IUpdate,
        },
      );
    },
  );
}
