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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_admin_shipment_list_multiple_sellers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.ILogin>(),
  });
  // 2. Create customer account to place order
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  // 3. Create first seller and product
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      shop_name: "Seller Shop 1",
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: "Product 1",
        description: "First seller product",
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: [{ sku_code: "SKU1", price_override: null }],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // 4. Create second seller and product
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      shop_name: "Seller Shop 2",
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: "Product 2",
        description: "Second seller product",
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: [{ sku_code: "SKU2", price_override: null }],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 5. Customer places order with items from multiple sellers
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 6. First seller creates shipment for their order items
  const seller1OrderItems = order.order_items.filter(
    (item) => item.seller.id === seller1.id,
  );
  if (seller1OrderItems.length > 0) {
    const shipment1 =
      await api.functional.ecommerceMall.seller.orders.shipments.create(
        seller1Connection,
        {
          orderId: order.id,
          body: {
            order_items: seller1OrderItems.map((item) => item.id),
            carrier_name: "Kuroneko Yamato",
            tracking_number: "123456789",
          } satisfies IEcommerceMallShipment.ICreate,
        },
      );
    typia.assert(shipment1);
  }
  // 7. Second seller creates shipment for their order items
  const seller2OrderItems = order.order_items.filter(
    (item) => item.seller.id === seller2.id,
  );
  if (seller2OrderItems.length > 0) {
    const shipment2 =
      await api.functional.ecommerceMall.seller.orders.shipments.create(
        seller2Connection,
        {
          orderId: order.id,
          body: {
            order_items: seller2OrderItems.map((item) => item.id),
            carrier_name: "Yuunyu",
            tracking_number: "987654321",
          } satisfies IEcommerceMallShipment.ICreate,
        },
      );
    typia.assert(shipment2);
  }
  // 8. Admin retrieves all shipments for the order
  const shipmentsPage =
    await api.functional.ecommerceMall.admin.orders.shipments.index(
      adminConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(shipmentsPage);
  // 9. Validate results
  TestValidator.predicate(
    "has at least one shipment",
    shipmentsPage.data.length >= 1,
  );
  TestValidator.predicate(
    "all shipments have valid seller",
    shipmentsPage.data.every((s) => s.seller !== null && s.seller.id !== null),
  );
  TestValidator.predicate(
    "all shipments have carrier info",
    shipmentsPage.data.every(
      (s) => s.carrier_name !== null || s.tracking_number !== null,
    ),
  );
  TestValidator.predicate(
    "shipments sorted by creation date",
    shipmentsPage.data.every(
      (_, i, arr) => i === 0 || arr[i - 1].created_at <= arr[i].created_at,
    ),
  );
}