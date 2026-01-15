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
export async function test_api_payment_method_update_currency_configuration(
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
  // Step 2: Create a payment method with initial currency USD
  const paymentMethod: IShoppingMallPaymentMethod =
    await generate_random_shopping_mall_admin_payment_methods_create(
      adminConnection,
      {
        body: {
          gatewayId: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<50>
          >(),
          supportedCurrencies: ["USD"],
          enabledRegions: ["US"],
          feePercentage: 2.99,
          feeFixedAmount: 0.3,
          requires3DSecure: true,
          maxAmount: 10000,
          minAmount: 0.01,
          experimental: false,
          onboardingUrl: "https://example.com/onboarding",
          businessClassification: "5411",
          autoRefundEnabled: true,
          settlementDays: 2,
          primaryForRegion: true,
          refundUrl: "https://example.com/refunds",
          supportsPartialCapture: true,
          authExpiryHours: 168,
          supportsRecurring: true,
          intervalBillingSupport: "monthly",
          customerIdRequirement: "required",
          marketingDescription: "Pay with credit card",
          documentationUrl: "https://example.com/docs",
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);
  // Step 3: Update the payment method currency from USD to EUR
  const updatedPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.payment_methods.update(
      adminConnection,
      {
        paymentMethodId: paymentMethod.id,
        body: {
          currency: "EUR", // Valid ISO 4217 currency code
        } satisfies IShoppingMallPaymentMethod.IUpdate,
      },
    );
  typia.assert(updatedPaymentMethod);
  // Step 4: Verify the currency was updated correctly
  TestValidator.equals(
    "currency updated to EUR",
    updatedPaymentMethod.currency,
    "EUR",
  );
}
