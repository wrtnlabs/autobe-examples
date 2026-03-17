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
 * Test partial update scenario where shipment tracking information is updated
 * with only one field at a time. The test should:
 * (1) Set up customer authentication and order creation
 * (2) Set up seller authentication and shipment creation with initial tracking details
 * (3) Update only the trackingCarrier field to "UPS" while leaving trackingNumber unchanged
 * (4) Verify the response shows the updated carrier with the original tracking number preserved
 * (5) Update only the trackingNumber field to "UP987654321" while leaving trackingCarrier unchanged
 * (6) Verify the response shows the updated tracking number with the carrier from step 3 preserved
 * This validates that partial updates work correctly and the system properly handles
 * optional fields in the update request without overwriting unspecified fields.
 */
export async function test_api_shipment_tracking_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Customer creates order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 4. Seller creates shipment with initial tracking details
  const initialCarrier = "FedEx";
  const initialTrackingNumber = "FX123456789";
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: order.items.map((item) => item.id),
        tracking_carrier: initialCarrier,
        tracking_number: initialTrackingNumber,
      },
    },
  );
  typia.assert(shipment);
  // Verify initial tracking information
  TestValidator.equals(
    "initial carrier",
    shipment.tracking_carrier,
    initialCarrier,
  );
  TestValidator.equals(
    "initial tracking number",
    shipment.tracking_number,
    initialTrackingNumber,
  );
  // 5. Partial update - only trackingCarrier
  const newCarrier = "UPS";
  const updateCarrierOnly =
    await api.functional.shoppingMall.customer.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          trackingCarrier: newCarrier,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updateCarrierOnly);
  // Verify carrier updated but tracking number preserved
  TestValidator.equals(
    "carrier updated",
    updateCarrierOnly.tracking_carrier,
    newCarrier,
  );
  TestValidator.equals(
    "tracking number preserved",
    updateCarrierOnly.tracking_number,
    initialTrackingNumber,
  );
  // 6. Partial update - only trackingNumber
  const newTrackingNumber = "UP987654321";
  const updateTrackingOnly =
    await api.functional.shoppingMall.customer.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          trackingNumber: newTrackingNumber,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updateTrackingOnly);
  // Verify tracking number updated but carrier preserved
  TestValidator.equals(
    "tracking number updated",
    updateTrackingOnly.tracking_number,
    newTrackingNumber,
  );
  TestValidator.equals(
    "carrier preserved",
    updateTrackingOnly.tracking_carrier,
    newCarrier,
  );
}
