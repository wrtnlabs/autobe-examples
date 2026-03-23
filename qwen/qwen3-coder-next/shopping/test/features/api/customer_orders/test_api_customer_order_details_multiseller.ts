import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_order_details_multiseller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1>
  >();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerName = RandomGenerator.name();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: customerName,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Register seller A account
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1>
  >();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAName = `SellerA_${RandomGenerator.alphabets(4)}`;
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      shop_name: sellerAName,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Register seller B account
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1>
  >();
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBName = `SellerB_${RandomGenerator.alphabets(4)}`;
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      shop_name: sellerBName,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Seller A creates a product
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          is_available: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          variants: ArrayUtil.repeat(
            2,
            () =>
              ({
                sku_code: typia.random<string & tags.MinLength<3>>(),
                price_override: typia.random<
                  number & tags.Type<"uint32"> & tags.Minimum<500>
                >(),
              }) satisfies IEcommerceMallProductVariant.ICreate,
          ) satisfies IEcommerceMallProductVariant.ICreate[],
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerAProduct);
  // 5. Seller B creates a product
  const sellerBProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          is_available: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          variants: ArrayUtil.repeat(
            2,
            () =>
              ({
                sku_code: typia.random<string & tags.MinLength<3>>(),
                price_override: typia.random<
                  number & tags.Type<"uint32"> & tags.Minimum<500>
                >(),
              }) satisfies IEcommerceMallProductVariant.ICreate,
          ) satisfies IEcommerceMallProductVariant.ICreate[],
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerBProduct);
  // 6. Customer creates order with items from both sellers
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 7. Seller A creates shipment for their items
  const sellerAOrderItems = order.order_items.filter(
    (item) => item.seller.id === sellerAProduct.seller.id,
  );
  const shipmentA =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          order_items: sellerAOrderItems.map((item) => item.id),
          carrier_name: RandomGenerator.pick([
            "Kuroneko Yamato",
            "Yuunyu",
            "CJ logistics",
          ]),
          tracking_number: `TRK${RandomGenerator.alphaNumeric(10)}`,
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipmentA);
  // 8. Seller B creates shipment for their items
  const sellerBOrderItems = order.order_items.filter(
    (item) => item.seller.id === sellerBProduct.seller.id,
  );
  const shipmentB =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerBConnection,
      {
        params: { orderId: order.id },
        body: {
          order_items: sellerBOrderItems.map((item) => item.id),
          carrier_name: RandomGenerator.pick([
            "Kuroneko Yamato",
            "Yuunyu",
            "CJ logistics",
          ]),
          tracking_number: `TRK${RandomGenerator.alphaNumeric(10)}`,
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipmentB);
  // 9. Customer retrieves order details
  const orderDetails = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(orderDetails);
  // 10. Validate response
  TestValidator.equals("order ID matches", orderDetails.id, order.id);
  TestValidator.equals(
    "customer matches",
    orderDetails.customer.id,
    order.customer.id,
  );
  TestValidator.equals(
    "total price matches",
    orderDetails.total_price,
    order.total_price,
  );
  TestValidator.equals(
    "order status matches",
    orderDetails.order_status,
    order.order_status,
  );
  // Validate seller A product
  const sellerAItems = orderDetails.order_items.filter(
    (item) => item.seller.id === sellerAProduct.seller.id,
  );
  TestValidator.equals(
    "seller A items count",
    sellerAItems.length,
    sellerAOrderItems.length,
  );
  // Validate seller B product
  const sellerBItems = orderDetails.order_items.filter(
    (item) => item.seller.id === sellerBProduct.seller.id,
  );
  TestValidator.equals(
    "seller B items count",
    sellerBItems.length,
    sellerBOrderItems.length,
  );
  // Validate shipments
  const shipments = [shipmentA, shipmentB];
  TestValidator.equals("number of shipments", shipments.length, 2);
  // Verify seller A shipment
  TestValidator.predicate(
    "seller A shipment carrier exists",
    shipmentA.carrier_name !== null && shipmentA.carrier_name !== undefined,
  );
  TestValidator.predicate(
    "seller A tracking number exists",
    shipmentA.tracking_number !== null &&
      shipmentA.tracking_number !== undefined,
  );
  // Verify seller B shipment
  TestValidator.predicate(
    "seller B shipment carrier exists",
    shipmentB.carrier_name !== null && shipmentB.carrier_name !== undefined,
  );
  TestValidator.predicate(
    "seller B tracking number exists",
    shipmentB.tracking_number !== null &&
      shipmentB.tracking_number !== undefined,
  );
}
