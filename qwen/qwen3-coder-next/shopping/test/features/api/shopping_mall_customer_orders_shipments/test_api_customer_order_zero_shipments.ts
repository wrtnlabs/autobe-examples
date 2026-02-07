import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_customer_carts_create } from "../../../generate/generate_random_shopping_mall_customer_carts_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_customer_order_zero_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResponse = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(customerResponse);
  // 2. Create seller account and product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResponse = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    },
  );
  typia.assert(sellerResponse);
  // 3. Create product for order
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    },
  );
  typia.assert(product);
  // 4. Add product to cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    customerConnection,
    {
      body: typia.random<IShoppingMallCart.ICreate>(),
    },
  );
  typia.assert(cart);
  // 5. Create order without shipments
  const orderResponse = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  const order = typia.assert<IShoppingMallOrder & { id: string }>(orderResponse);
  // 6. Get shipments for the order (should be empty)
  const shipmentsResponse =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(shipmentsResponse);
  // 7. Validate empty shipments with proper pagination
  TestValidator.equals(
    "zero shipments count",
    shipmentsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records zero",
    shipmentsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    shipmentsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    shipmentsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination pages",
    shipmentsResponse.pagination.pages,
    0,
  );
}