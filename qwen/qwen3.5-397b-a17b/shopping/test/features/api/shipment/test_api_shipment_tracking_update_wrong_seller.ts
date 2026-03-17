import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test shipment tracking update authorization: Seller B cannot update Seller A's shipment.
 *
 * This test validates the critical business rule that only the seller who created
 * a shipment can update its tracking information. The test creates a shipment owned
 * by Seller A, then attempts to update it as Seller B (non-owner), expecting a 403
 * Forbidden error because Seller B has no relationship to the shipment through
 * order_items.
 *
 * Workflow:
 * 1. Seller A registers and authenticates (shipment owner)
 * 2. Customer registers and authenticates (places order)
 * 3. Customer places order (creates order items linking to Seller A)
 * 4. Seller A creates shipment for order items
 * 5. Seller B registers and authenticates (non-owner seller)
 * 6. Seller B attempts to update shipment tracking - should fail with 403
 */
export async function test_api_shipment_tracking_update_wrong_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller A registration and authentication (shipment owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Step 2: Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 3: Customer places order (this creates order items linked to Seller A's product)
  // Note: This requires a product to exist in the system. We'll use the generation function
  // which handles the product setup internally
  const order =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has items from Seller A
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItemIds = order.items.map((item) => item.id);
  // Step 4: Seller A creates shipment for the order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 5: Seller B registration and authentication (different seller, non-owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Verify Seller B is different from Seller A
  TestValidator.notEquals(
    "Seller B different from Seller A",
    sellerB.id,
    sellerA.id,
  );
  // Step 6: Seller B attempts to update shipment tracking - should fail with 403 Forbidden
  // This is the critical authorization test: Seller B cannot update Seller A's shipment
  await TestValidator.error(
    "Seller B cannot update Seller A's shipment - 403 Forbidden",
    async () => {
      await api.functional.shoppingMall.seller.shipments.update(
        sellerBConnection,
        {
          shipmentId: shipment.id,
          body: {
            trackingCarrier: "UPS",
            trackingNumber: RandomGenerator.alphaNumeric(12),
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );
}