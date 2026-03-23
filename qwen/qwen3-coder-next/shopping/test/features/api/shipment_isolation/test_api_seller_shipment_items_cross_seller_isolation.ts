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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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

export async function test_api_seller_shipment_items_cross_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A registration and product creation
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerA);
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          is_available: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(sellerAProduct);
  // 2. Seller B registration and product creation
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerB);
  const sellerBProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          is_available: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(sellerBProduct);
  // 3. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  // 4. Customer purchases from Seller A (creates order with Seller A items)
  const orderA =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(orderA);
  // Verify order A has Seller A items
  const sellerAOrderItems = orderA.order_items.filter(
    (item) => item.seller.id === sellerA.id,
  );
  TestValidator.predicate(
    "seller A has order items",
    sellerAOrderItems.length > 0,
  );
  // Customer purchases from Seller B (creates separate order with Seller B items)
  const orderB =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(orderB);
  // Verify order B has Seller B items
  const sellerBOrderItems = orderB.order_items.filter(
    (item) => item.seller.id === sellerB.id,
  );
  TestValidator.predicate(
    "seller B has order items",
    sellerBOrderItems.length > 0,
  );
  // 5. Seller A creates shipment for their order items
  const sellerAShipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerAConnection,
      {
        orderId: orderA.id,
        body: {
          order_items: sellerAOrderItems.map((item) => item.id),
        },
      },
    );
  typia.assert(sellerAShipment);
  // 6. Seller B creates shipment for their order items
  const sellerBShipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerBConnection,
      {
        orderId: orderB.id,
        body: {
          order_items: sellerBOrderItems.map((item) => item.id),
        },
      },
    );
  typia.assert(sellerBShipment);
  // 7. Test: Seller B attempts to access Seller A's shipment items (should fail)
  await TestValidator.error(
    "seller B cannot access seller A shipment items",
    async () => {
      await api.functional.ecommerceMall.seller.shipments.items.search(
        sellerBConnection,
        {
          shipmentId: sellerAShipment.id,
        },
      );
    },
  );
  // 8. Test: Seller A attempts to access Seller B's shipment items (should fail)
  await TestValidator.error(
    "seller A cannot access seller B shipment items",
    async () => {
      await api.functional.ecommerceMall.seller.shipments.items.search(
        sellerAConnection,
        {
          shipmentId: sellerBShipment.id,
        },
      );
    },
  );
  // 9. Verify each seller can access their own shipment items
  const sellerAItems =
    await api.functional.ecommerceMall.seller.shipments.items.search(
      sellerAConnection,
      {
        shipmentId: sellerAShipment.id,
      },
    );
  typia.assert(sellerAItems);
  const sellerBItems =
    await api.functional.ecommerceMall.seller.shipments.items.search(
      sellerBConnection,
      {
        shipmentId: sellerBShipment.id,
      },
    );
  typia.assert(sellerBItems);
  TestValidator.equals(
    "seller A shipment has correct items",
    sellerAItems.data.length,
    sellerAOrderItems.length,
  );
  TestValidator.equals(
    "seller B shipment has correct items",
    sellerBItems.data.length,
    sellerBOrderItems.length,
  );
}