import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodBillingInterval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodBillingInterval";
import type { IShoppingMallPaymentMethodConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodConfig";
import type { IShoppingMallPaymentMethodCustomerIdRequirement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodCustomerIdRequirement";
import type { IShoppingMallPaymentMethodSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurchargeRule";
import type { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";
import { prepare_random_shopping_mall_payment_method } from "../../../prepare/prepare_random_shopping_mall_payment_method";
import { prepare_random_shopping_mall_payment_surcharge_rule } from "../../../prepare/prepare_random_shopping_mall_payment_surcharge_rule";
import { generate_random_shopping_mall_admin_payment_methods_create } from "../../../generate/generate_random_shopping_mall_admin_payment_methods_create";
import { generate_random_shopping_mall_admin_payment_surcharge_rules_create } from "../../../generate/generate_random_shopping_mall_admin_payment_surcharge_rules_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_surcharge_rule_create_inactive_percentage(
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
  // Step 2: Create a payment method to reference in the surcharge rule
  const paymentMethod: IShoppingMallPaymentMethod =
    await generate_random_shopping_mall_admin_payment_methods_create(
      adminConnection,
      {
        body: {
          gatewayId: "stripe",
          supportedCurrencies: ["USD"],
          enabledRegions: ["US"],
          feePercentage: 2.99,
          feeFixedAmount: 0.3,
          requires3DSecure: true,
          maxAmount: 10000,
          minAmount: 1,
          experimental: false,
          onboardingUrl: "https://stripe.com/connect",
          businessClassification: "5411",
          autoRefundEnabled: true,
          negotiatedRateOverride: undefined, // Fixed: Changed null to undefined to match schema
          settlementDays: 2,
          primaryForRegion: true,
          refundUrl: "https://example.com/refunds",
          supportsPartialCapture: true,
          authExpiryHours: 168,
          supportsRecurring: true,
          intervalBillingSupport: "monthly",
          customerIdRequirement: "required",
          marketingDescription: "Pay with credit card",
          documentationUrl: "https://stripe.com/docs",
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);
  // Step 3: Create the inactive percentage-based surcharge rule using the direct SDK function
  const surchargeRule: IShoppingMallPaymentSurchargeRule =
    await api.functional.shoppingMall.admin.payment_surcharge_rules.create(
      adminConnection,
      {
        body: {
          payment_method_id: paymentMethod.id,
          region_id: undefined, // Applies globally
          currency_code: undefined, // Applies to all currencies
          min_amount: 500, // Applies to transactions above $500
          max_amount: undefined, // No maximum amount limit
          surcharge_amount: undefined, // Not used
          surcharge_percentage: 2.5, // 2.5% percentage fee
          priority: 1, // Highest priority
          is_active: false, // Explicitly inactive
        } satisfies IShoppingMallPaymentSurchargeRule.ICreate,
      },
    );
  typia.assert(surchargeRule);
  // Step 4: Validate the created surcharge rule has the correct configuration
  TestValidator.equals(
    "payment method ID matches",
    surchargeRule.payment_method_id,
    paymentMethod.id,
  );
  TestValidator.equals(
    "region ID is null (global)",
    surchargeRule.region_id,
    undefined,
  );
  TestValidator.equals(
    "currency code is null (all currencies)",
    surchargeRule.currency_code,
    undefined,
  );
  TestValidator.equals("minimum amount is 500", surchargeRule.min_amount, 500);
  TestValidator.equals(
    "maximum amount is null (no limit)",
    surchargeRule.max_amount,
    undefined,
  );
  TestValidator.equals(
    "surcharge amount is null (percentage used)",
    surchargeRule.surcharge_amount,
    undefined,
  );
  TestValidator.equals(
    "surcharge percentage is 2.5",
    surchargeRule.surcharge_percentage,
    2.5,
  );
  TestValidator.equals("priority is 1", surchargeRule.priority, 1);
  TestValidator.equals(
    "is_active is false (inactive)",
    surchargeRule.is_active,
    false,
  );
  TestValidator.predicate(
    "surcharge percentage is between 0 and 100",
    () =>
      typia.assert<number>(surchargeRule.surcharge_percentage) >= 0 &&
      typia.assert<number>(surchargeRule.surcharge_percentage) <= 100,
  );
}