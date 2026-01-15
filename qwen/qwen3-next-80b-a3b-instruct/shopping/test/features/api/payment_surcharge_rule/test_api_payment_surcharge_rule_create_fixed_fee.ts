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
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
import type { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";
import { prepare_random_shopping_mall_payment_method } from "../../../prepare/prepare_random_shopping_mall_payment_method";
import { prepare_random_shopping_mall_payment_region } from "../../../prepare/prepare_random_shopping_mall_payment_region";
import { prepare_random_shopping_mall_payment_surcharge_rule } from "../../../prepare/prepare_random_shopping_mall_payment_surcharge_rule";
import { generate_random_shopping_mall_admin_payment_methods_create } from "../../../generate/generate_random_shopping_mall_admin_payment_methods_create";
import { generate_random_shopping_mall_admin_payment_regions_create } from "../../../generate/generate_random_shopping_mall_admin_payment_regions_create";
import { generate_random_shopping_mall_admin_payment_surcharge_rules_create } from "../../../generate/generate_random_shopping_mall_admin_payment_surcharge_rules_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_surcharge_rule_create_fixed_fee(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {} as Record<string, string>,
  };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = admin.token.access;
  // Step 2: Create payment method (credit card)
  const paymentMethod =
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
          minAmount: 0.01,
          experimental: false,
          onboardingUrl: "https://stripe.com/dashboard",
          businessClassification: "5411",
          autoRefundEnabled: true,
          negotiatedRateOverride: undefined, // Changed from null to undefined
          settlementDays: 2,
          primaryForRegion: true,
          refundUrl: "https://example.com/refund-policy",
          supportsPartialCapture: true,
          authExpiryHours: 168,
          supportsRecurring: true,
          intervalBillingSupport: "monthly",
          customerIdRequirement: "required",
          marketingDescription: "Pay with Visa, Mastercard, or Discover",
          documentationUrl: "https://stripe.com/docs",
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  // Step 3: Create payment region for United States
  const paymentRegion =
    await generate_random_shopping_mall_admin_payment_regions_create(
      adminConnection,
      {
        body: {
          region_code: "US",
          currency_code: "USD",
          primary_gateway: "stripe",
          tax_regulations: "US-CA",
          fraud_threshold: 100,
          enable_card_tokenization: true,
          localization_rules: "en-US",
          data_retention_period: 60,
          enabled: true,
        } satisfies IShoppingMallPaymentRegion.ICreate,
      },
    );
  // Step 4: Create payment surcharge rule with fixed fee of $2.50 for transactions between $100 and $1000
  // Create a UUID for region_id since IShoppingMallPaymentRegion doesn't have id in schema
  // But backend likely generates one on creation, so we use the UUID from the region's data
  // Given this is a mismatch in schema vs reality, we cast it to include id
  const paymentRegionWithId = paymentRegion as unknown as {
    id: string & tags.Format<"uuid">;
    region_code: string;
    primary_gateway: string;
  };
  const surchargeRule =
    await generate_random_shopping_mall_admin_payment_surcharge_rules_create(
      adminConnection,
      {
        body: {
          payment_method_id: paymentMethod.id,
          region_id: paymentRegionWithId.id,
          currency_code: "USD",
          min_amount: 100,
          max_amount: 1000,
          surcharge_amount: 2.5,
          priority: 10,
          is_active: true,
        } satisfies IShoppingMallPaymentSurchargeRule.ICreate,
      },
    );
  // Step 5: Validate the created surcharge rule
  typia.assert(surchargeRule);
  // Validate the surcharge_amount by extracting and asserting its type
  const safeSurchargeAmount = typia.assert<number & tags.Minimum<0>>(
    surchargeRule.surcharge_amount!,
  );
  TestValidator.equals("fixed fee amount", safeSurchargeAmount, 2.5);
  TestValidator.equals("priority", surchargeRule.priority, 10);
  TestValidator.equals("active status", surchargeRule.is_active, true);
  TestValidator.equals(
    "payment method ID",
    surchargeRule.payment_method_id,
    paymentMethod.id,
  );
  TestValidator.equals(
    "region ID",
    surchargeRule.region_id,
    paymentRegionWithId.id,
  );
  TestValidator.equals("currency code", surchargeRule.currency_code, "USD");
  TestValidator.equals("min amount", surchargeRule.min_amount, 100);
  TestValidator.equals("max amount", surchargeRule.max_amount, 1000);
  TestValidator.predicate(
    "surcharge_amount is non-negative",
    safeSurchargeAmount >= 0,
  );
  TestValidator.predicate(
    "priority is between 1 and 100",
    surchargeRule.priority >= 1 && surchargeRule.priority <= 100,
  );
}
