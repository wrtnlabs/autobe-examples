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
import type { IShoppingMallPaymentMethodFees } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodFees";
import type { IShoppingMallPaymentMethodSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurchargeRule";
import { prepare_random_shopping_mall_payment_method } from "../../../prepare/prepare_random_shopping_mall_payment_method";
import { generate_random_shopping_mall_admin_payment_methods_create } from "../../../generate/generate_random_shopping_mall_admin_payment_methods_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_method_update_active_status(
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
  // Step 2: Create a payment method to update
  const paymentMethod =
    await generate_random_shopping_mall_admin_payment_methods_create(
      adminConnection,
      {
        body: {
          gatewayId: "stripe",
          supportedCurrencies: ["KRW"],
          enabledRegions: ["KR"],
          feePercentage: 2.99,
          feeFixedAmount: 0.3,
          requires3DSecure: true,
          maxAmount: 1000000,
          minAmount: 0.01,
          experimental: false,
          onboardingUrl: "https://stripe.com/onboard",
          businessClassification: "5411",
          autoRefundEnabled: true,
          settlementDays: 2,
          primaryForRegion: true,
          refundUrl: "https://example.com/refund-policy",
          supportsPartialCapture: true,
          authExpiryHours: 168,
          supportsRecurring: true,
          intervalBillingSupport: "monthly",
          customerIdRequirement: "optional",
          marketingDescription: "Pay with credit card",
          documentationUrl: "https://example.com/docs",
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  // Step 3: Verify initial is_active status is true
  TestValidator.equals(
    "initial payment method should be active",
    paymentMethod.is_active,
    true,
  );
  // Step 4: Update payment method's is_active status to false
  const updatedPaymentMethod =
    await api.functional.shoppingMall.admin.payment_methods.update(
      adminConnection,
      {
        paymentMethodId: paymentMethod.id,
        body: {
          is_active: false,
        } satisfies IShoppingMallPaymentMethod.IUpdate,
      },
    );
  // Step 5: Verify the update was successful
  TestValidator.equals(
    "payment method should be inactive after update",
    updatedPaymentMethod.is_active,
    false,
  );
  // Step 6: Verify other properties were unchanged
  TestValidator.equals(
    "payment method ID should remain the same",
    updatedPaymentMethod.id,
    paymentMethod.id,
  );
  TestValidator.equals(
    "payment method gateway_id should remain the same",
    updatedPaymentMethod.gateway_id,
    paymentMethod.gateway_id,
  );
  TestValidator.equals(
    "payment method display_name should remain the same",
    updatedPaymentMethod.display_name,
    paymentMethod.display_name,
  );
  TestValidator.equals(
    "payment method type should remain the same",
    updatedPaymentMethod.type,
    paymentMethod.type,
  );
  TestValidator.equals(
    "payment method currency should remain the same",
    updatedPaymentMethod.currency,
    paymentMethod.currency,
  );
  TestValidator.equals(
    "payment method is_default should remain the same",
    updatedPaymentMethod.is_default,
    paymentMethod.is_default,
  );
  TestValidator.equals(
    "payment method config should remain the same",
    updatedPaymentMethod.config,
    paymentMethod.config,
  );
  TestValidator.equals(
    "payment method region should remain the same",
    updatedPaymentMethod.region,
    paymentMethod.region,
  );
  TestValidator.equals(
    "payment method surcharge_rules should remain the same",
    updatedPaymentMethod.surcharge_rules,
    paymentMethod.surcharge_rules,
  );
  // Step 7: Confirm response type is correct
  typia.assert(updatedPaymentMethod);
}
