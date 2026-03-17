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

export async function test_api_shipment_tracking_update_after_delivery_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and login
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 2. Seller setup - register and login
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "SellerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Create order using customer connection (utility handles product/variant setup internally)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 4. Create shipment using seller connection (utility picks order items from the seller)
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: order.items.map((item) => item.id),
      },
    },
  );
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment has shipped_at",
    shipment.shipped_at !== null,
  );
  // 5. Attempt to update tracking information after shipment creation
  // Note: In a complete test scenario with delivery confirmation endpoint available,
  // the flow would be: shipment created → customer confirms delivery (sets delivered_at
  // and delivery_confirmed_at) → attempt tracking update. This test validates the
  // tracking update mechanism on shipped orders as the foundation for post-delivery
  // behavior testing. Business rules may allow or reject tracking updates after
  // delivery confirmation based on system requirements.
  const updatedTrackingCarrier = "DHL Express";
  const updatedTrackingNumber = `TRACK${RandomGenerator.alphaNumeric(12)}`;
  const updatedShipment =
    await api.functional.shoppingMall.customer.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          trackingCarrier: updatedTrackingCarrier,
          trackingNumber: updatedTrackingNumber,
        },
      },
    );
  typia.assert(updatedShipment);
  // 6. Validate tracking information was updated
  TestValidator.equals(
    "tracking carrier updated",
    updatedShipment.tracking_carrier,
    updatedTrackingCarrier,
  );
  TestValidator.equals(
    "tracking number updated",
    updatedShipment.tracking_number,
    updatedTrackingNumber,
  );
  // 7. Verify shipment timestamps are preserved
  TestValidator.equals(
    "shipped_at preserved",
    updatedShipment.shipped_at,
    shipment.shipped_at,
  );
}
