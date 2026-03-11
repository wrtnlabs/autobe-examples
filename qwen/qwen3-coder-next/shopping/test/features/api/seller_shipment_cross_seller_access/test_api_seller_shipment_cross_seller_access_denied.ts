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

export async function test_api_seller_shipment_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as Seller A and create product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerA: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerAConnection,
    {
      body: sellerAJoinBody,
    },
  );
  typia.assert(sellerA);
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1> &
              tags.Maximum<100000>
          >(),
          is_available: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          images: [
            {
              files: [RandomGenerator.alphaNumeric(32)],
            },
          ],
          variants: ArrayUtil.repeat(
            2,
            () =>
              ({
                sku_code: RandomGenerator.alphaNumeric(8),
                price_override: null,
              }) satisfies IEcommerceMallProductVariant.ICreate,
          ),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerAProduct);
  // 2. Auth as Seller B and create product
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerB: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerBConnection,
    {
      body: sellerBJoinBody,
    },
  );
  typia.assert(sellerB);
  const sellerBProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1> &
              tags.Maximum<100000>
          >(),
          is_available: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          images: [
            {
              files: [RandomGenerator.alphaNumeric(32)],
            },
          ],
          variants: ArrayUtil.repeat(
            2,
            () =>
              ({
                sku_code: RandomGenerator.alphaNumeric(8),
                price_override: null,
              }) satisfies IEcommerceMallProductVariant.ICreate,
          ),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerBProduct);
  // 3. Auth as Customer and place multi-seller order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: customerJoinBody,
    });
  typia.assert(customer);
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  TestValidator.predicate("order has items", order.order_items.length > 1);
  // 4. Seller A creates shipment for their item
  const sellerAItems = order.order_items.filter(
    (item) => item.seller.id === sellerA.id,
  );
  TestValidator.predicate(
    "Seller A has items in order",
    sellerAItems.length > 0,
  );
  const sellerAShipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerAConnection,
      {
        orderId: order.id,
        body: {
          order_items: sellerAItems.map((item) => item.id),
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(sellerAShipment);
  // 5. Seller B creates shipment for their item
  const sellerBItems = order.order_items.filter(
    (item) => item.seller.id === sellerB.id,
  );
  TestValidator.predicate(
    "Seller B has items in order",
    sellerBItems.length > 0,
  );
  const sellerBShipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerBConnection,
      {
        orderId: order.id,
        body: {
          order_items: sellerBItems.map((item) => item.id),
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(sellerBShipment);
  // 6. Test cross-seller access denial
  await TestValidator.error("cross-seller shipment access denied", async () => {
    await api.functional.ecommerceMall.seller.shipments.at(sellerBConnection, {
      shipmentId: sellerAShipment.id,
    });
  });
}