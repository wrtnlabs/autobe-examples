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

export async function test_api_seller_shipment_items_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller A with approval
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Seller A creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = typia.assert<IEcommerceMallCustomer.IJoin>(
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCustomer.IJoin,
    }),
  );
  typia.assert(customer);
  const customerLoginResult = await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 4. Customer purchases the product
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 5. Seller A creates a shipment for the order
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerAConnection,
      {
        orderId: order.id,
        body: {
          order_items: order.order_items.map((item) => item.id) as (string &
            tags.Format<"uuid">)[] &
            tags.MinItems<1>,
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 6. Seller A retrieves shipment items
  const result =
    await api.functional.ecommerceMall.seller.shipments.items.search(
      sellerAConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(result);
  // 7. Validate response structure
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.predicate("has data", result.data.length > 0);
  if (result.data.length > 0) {
    const firstItem = result.data[0];
    TestValidator.equals("seller matches", firstItem.seller.id, sellerA.id);
    const itemOrder = firstItem as any as { order: { id: string } };
    TestValidator.equals(
      "shipment belongs to order",
      itemOrder.order.id,
      order.id,
    );
  }
}