import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_customer_order_items_filter_by_status_paid(
  connection: api.IConnection,
): Promise<void> {
  // Describe the scenario
  /**
   * Test retrieving a paginated list of order items filtered by status (paid) for an authenticated customer.
   * Validate that the returned order items belong only to the authenticated customer.
   * Check pagination response includes page info and that each item has correct quantity, status, product variant, and order details.
   * Confirm filtering parameters are respected and unauthorized access is rejected.
   */
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: { password: "seller1234" },
  });
  typia.assert(seller);
  // For a realistic shop name, no need to override shopName, using default random
  // 2. Create product by seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { base_price: 10000 },
    },
  );
  typia.assert(product);
  // 3. Create product variant under product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: { password: "customer1234" },
  });
  typia.assert(customer);
  // 5. Create order by customer with the product variant
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        orderItems: [
          {
            shoppingMallProductVariantId: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Retrieve order items by status = "paid" for authenticated customer
  const filterBody: IShoppingMallOrderItem.IRequest = {
    status: "paid",
    page: 1,
    limit: 10,
  };
  const listResult =
    await api.functional.shoppingMall.customer.order_items.index(
      customerConnection,
      {
        body: filterBody,
      },
    );
  typia.assert(listResult);
  // 7. Validate pagination exists
  TestValidator.predicate(
    "pagination field present",
    listResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    listResult.pagination.current === 1,
  );
  // 8. Validate all order items
  TestValidator.predicate("has order items data", listResult.data.length > 0);
  for (const item of listResult.data) {
    typia.assert(item);
    // Quantity check
    TestValidator.predicate("order item quantity positive", item.quantity > 0);
    // Status is paid
    TestValidator.equals("order item status paid", item.status, "paid");
    // Product variant present
    TestValidator.predicate(
      "product variant present",
      item.productVariant !== undefined && item.productVariant !== null,
    );
    // Order present
    TestValidator.predicate(
      "order present",
      item.order !== undefined && item.order !== null,
    );
    // Customer ID matches
    TestValidator.equals(
      "order item customer id",
      item.order.customer.id,
      customer.id,
    );
  }
  // 9. Test unauthorized access rejected
  // Create a fresh non-authorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access rejected",
    401,
    async () => {
      await api.functional.shoppingMall.customer.order_items.index(
        unauthorizedConnection,
        {
          body: filterBody,
        },
      );
    },
  );
}
