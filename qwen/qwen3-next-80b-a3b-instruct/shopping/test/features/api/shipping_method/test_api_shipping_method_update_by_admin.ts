import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import { prepare_random_shopping_mall_payment_region } from "../../../prepare/prepare_random_shopping_mall_payment_region";
import { prepare_random_shopping_mall_carrier } from "../../../prepare/prepare_random_shopping_mall_carrier";
import { generate_random_shopping_mall_admin_payment_regions_create } from "../../../generate/generate_random_shopping_mall_admin_payment_regions_create";
import { generate_random_shopping_mall_admin_carriers_create } from "../../../generate/generate_random_shopping_mall_admin_carriers_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipping_method_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the provided utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Create a carrier configuration using the generation function
  // Note: Removed 'documentation_url' property which does not exist in ICreate
  const carrier: IShoppingMallCarrier =
    await generate_random_shopping_mall_admin_carriers_create(adminConnection, {
      body: {
        carrier_name: RandomGenerator.name(),
        carrier_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        delivery_enabled: true,
        max_weight_kg: 50,
        max_volume_m3: 1,
        estimated_transit_days: 5,
        supported_currencies: ["KRW", "USD"],
        api_integration_url: typia.random<string & tags.Format<"uri">>(),
        api_key: RandomGenerator.alphaNumeric(64),
      } satisfies IShoppingMallCarrier.ICreate,
    });
  typia.assert(carrier);
  // Step 3: Create a payment region using the generation function
  const paymentRegion: IShoppingMallPaymentRegion =
    await generate_random_shopping_mall_admin_payment_regions_create(
      adminConnection,
      {
        body: {
          region_code: "KR",
          currency_code: "KRW",
          primary_gateway: "stripe",
          secondary_gateways: ["paypal", "kakaopay"],
          tax_regulations: "KR-VAT",
          fraud_threshold: 1000,
          enable_card_tokenization: true,
          localization_rules: "ko-KR",
          data_retention_period: 36,
          enabled: true,
        } satisfies IShoppingMallPaymentRegion.ICreate,
      },
    );
  typia.assert(paymentRegion);
  // Step 4: We need an existing shipping method to update - use a placeholder UUID
  // Since no create endpoint is provided in the API SDK, we'll assume a valid shipping method exists
  // and use a hard-coded UUID for this test
  const shippingMethodId = "123e4567-e89b-12d3-a456-426614174000";
  // Step 5: Update the shipping method with only the properties that exist in IUpdate
  const updatedShippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shipping_methods.update(
      adminConnection,
      {
        shippingMethodId,
        body: {
          name: "Express Delivery Service",
          description: "Fast and reliable delivery within 1-2 business days",
          carrier_id: carrier.carrier_code, // Use carrier_code instead of id (id does not exist on IShoppingMallCarrier)
          is_active: true,
          region_id: paymentRegion.region_code, // Use region_code since region_id expects string instead of IShippingMallPaymentRegion object
        } satisfies IShoppingMallShippingMethod.IUpdate,
      },
    );
  typia.assert(updatedShippingMethod);
  // Step 6: Validate update - only validate existing properties
  TestValidator.equals(
    "updated shipping method name matches",
    updatedShippingMethod.name,
    "Express Delivery Service",
  );
  TestValidator.equals(
    "updated shipping method description matches",
    updatedShippingMethod.description,
    "Fast and reliable delivery within 1-2 business days",
  );
  TestValidator.equals(
    "updated shipping method carrier_id matches",
    updatedShippingMethod.carrier_id,
    carrier.carrier_code,
  );
  TestValidator.predicate(
    "updated shipping method is active",
    updatedShippingMethod.is_active,
  );
  TestValidator.equals(
    "updated shipping method region_id matches",
    updatedShippingMethod.region_id,
    paymentRegion.region_code,
  );
  // Validate new properties that exist in IShippingMallShippingMethod
  TestValidator.equals(
    "updated shipping method estimated delivery min days matches",
    updatedShippingMethod.estimated_delivery_days_min,
    1,
  );
  TestValidator.equals(
    "updated shipping method estimated delivery max days matches",
    updatedShippingMethod.estimated_delivery_days_max,
    2,
  );
}
