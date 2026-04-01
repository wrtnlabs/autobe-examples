import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_tracking_update_duplicate_tracking_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate first seller
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(firstSeller);
  // 2. Register and authenticate second seller
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(secondSeller);
  // 3. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 4. Customer creates shipping address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state: RandomGenerator.name(1),
        postalCode: typia.random<string>(),
        country: RandomGenerator.name(1),
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 5. Customer adds product variants to cart
  // Note: This requires existing product variants in the system
  const cartItem1 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 6. Customer creates order
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Extract order items for each seller
  const firstSellerOrderItem = order.orderItems.find(
    (item) => item.seller.id === firstSeller.id,
  );
  const secondSellerOrderItem = order.orderItems.find(
    (item) => item.seller.id === secondSeller.id,
  );
  if (!firstSellerOrderItem || !secondSellerOrderItem) {
    throw new Error("Order items not found for both sellers");
  }
  // 7. First seller creates shipment with tracking number 'UNIQUE123'
  const firstShipment =
    await api.functional.shoppingMall.seller.shipments.create(
      firstSellerConnection,
      {
        body: {
          tracking_carrier: "FedEx",
          tracking_number: "UNIQUE123",
          order_item_ids: [firstSellerOrderItem.id],
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(firstShipment);
  TestValidator.equals(
    "first shipment tracking number",
    firstShipment.tracking_number,
    "UNIQUE123",
  );
  // 8. Second seller creates shipment with tracking number 'OTHER456'
  const secondShipment =
    await api.functional.shoppingMall.seller.shipments.create(
      secondSellerConnection,
      {
        body: {
          tracking_carrier: "UPS",
          tracking_number: "OTHER456",
          order_item_ids: [secondSellerOrderItem.id],
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(secondShipment);
  TestValidator.equals(
    "second shipment tracking number",
    secondShipment.tracking_number,
    "OTHER456",
  );
  // 9. First seller attempts to update tracking number to 'OTHER456' (should fail with 409)
  await TestValidator.error(
    "duplicate tracking number should fail",
    async () => {
      await api.functional.shoppingMall.seller.shipments.update(
        firstSellerConnection,
        {
          shipmentId: firstShipment.id,
          body: {
            trackingNumber: "OTHER456",
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );
  // 10. Verify first seller's tracking number remains unchanged
  const firstShipmentAfter =
    await api.functional.shoppingMall.seller.shipments.update(
      firstSellerConnection,
      {
        shipmentId: firstShipment.id,
        body: {
          trackingCarrier: "FedEx",
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(firstShipmentAfter);
  TestValidator.equals(
    "first shipment tracking unchanged",
    firstShipmentAfter.tracking_number,
    "UNIQUE123",
  );
  // 11. Verify second seller's tracking number remains unchanged
  const secondShipmentAfter =
    await api.functional.shoppingMall.seller.shipments.update(
      secondSellerConnection,
      {
        shipmentId: secondShipment.id,
        body: {
          trackingCarrier: "UPS",
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(secondShipmentAfter);
  TestValidator.equals(
    "second shipment tracking unchanged",
    secondShipmentAfter.tracking_number,
    "OTHER456",
  );
}
