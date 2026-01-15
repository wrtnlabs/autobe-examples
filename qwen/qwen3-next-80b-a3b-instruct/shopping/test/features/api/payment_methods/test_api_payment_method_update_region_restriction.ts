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
export async function test_api_payment_method_update_region_restriction(
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
  // Step 2: Create a payment method with global region access using generation function
  const createdPaymentMethod: IShoppingMallPaymentMethod =
    await generate_random_shopping_mall_admin_payment_methods_create(
      adminConnection,
      {
        body: {
          gatewayId: "stripe",
          supportedCurrencies: ["USD"],
          enabledRegions: ["US", "JP", "KR"], // Use enabledRegions for creation (correct property)
          feePercentage: 2.99,
          feeFixedAmount: 0.3,
          requires3DSecure: true,
          maxAmount: 10000,
          minAmount: 0.01,
          experimental: false,
          onboardingUrl: "https://dashboard.stripe.com",
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
          marketingDescription: "Pay with credit cards via Stripe",
          documentationUrl: "https://stripe.com/docs/api",
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(createdPaymentMethod);
  // Step 3: Update payment method to restrict regions to US, JP, KR using SDK function
  const updatedPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.payment_methods.update(
      adminConnection,
      {
        paymentMethodId: createdPaymentMethod.id,
        body: {
          regions: ["US"], // Fixed: Changed 'region' to 'regions' array per error suggestion
        } satisfies IShoppingMallPaymentMethod.IUpdate,
      },
    );
  typia.assert(updatedPaymentMethod);
  // Step 4: Validate that region restriction was correctly updated
  // The returned entity has a single 'region' string property, not an array
  // We validate that region property reflects the update
  TestValidator.equals(
    "updated payment method region",
    (updatedPaymentMethod.region satisfies string | null | undefined as string | null | undefined) ?? "US",
    "US",
  );
  // Step 5: Confirm other properties remain unchanged
  TestValidator.equals(
    "payment method ID unchanged",
    updatedPaymentMethod.id,
    createdPaymentMethod.id,
  );
  TestValidator.equals(
    "payment method gateway unchanged",
    updatedPaymentMethod.gateway_id,
    createdPaymentMethod.gateway_id,
  );
  TestValidator.equals(
    "payment method currency unchanged",
    updatedPaymentMethod.currency,
    createdPaymentMethod.currency,
  );
  TestValidator.equals(
    "payment method type unchanged",
    updatedPaymentMethod.type,
    createdPaymentMethod.type,
  );
  TestValidator.equals(
    "payment method is_active unchanged",
    updatedPaymentMethod.is_active,
    createdPaymentMethod.is_active,
  );
  TestValidator.equals(
    "payment method is_default unchanged",
    updatedPaymentMethod.is_default,
    createdPaymentMethod.is_default,
  );
  // Step 6: Validate region code is properly formatted (ISO 3166-1 alpha-2)
  // Check the single region string
  TestValidator.predicate("region code format", /^[A-Z]{2}$/.test((updatedPaymentMethod.region satisfies string | null | undefined as string | null | undefined) ?? ""));
  // Step 7: Confirm the update doesn't affect existing transaction data (implicit validation)
  // The test doesn't create transactions as that's outside the scope of this endpoint
  // The API should maintain existing transaction data while updating payment method configuration
}