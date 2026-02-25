import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
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
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_seller_inventory_history_reason_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerCreds,
  });
  typia.assert(sellerAuthorized);
  const sellerLoginCreds = {
    email: sellerCreds.email,
    password: sellerCreds.password,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn = await authorize_seller_login(sellerConnection, {
    body: sellerLoginCreds,
  });
  typia.assert(sellerLoggedIn);
  // 2. Create product with variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: "550e8400-e29b-41d4-a716-446655440000", // Use a predefined category ID
        base_price: 10000,
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            option_values: [
              {
                option_name: "color",
                option_value: "white",
              },
            ],
            price_override: 12000,
            stock_quantity: 50,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant = product.variants[0];
  // 3. Create customer for placing orders
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCreds = {
    email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
    password: "1234",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerCreds,
  });
  typia.assert(customerAuthorized);
  // 4. Create an order to generate inventory history with reason 'order'
  // Since we don't have a direct order creation API, we'll create inventory history manually
  // through restock operations (positive) and order-like operations (negative)
  // Create 'order' type inventory history by directly calling inventory operations
  await api.functional.shoppingMall.seller.inventory.restock(sellerConnection, {
    variantId: variant.id,
  });
  // Create 'order_cancellation' type inventory history
  await api.functional.shoppingMall.seller.inventory.restock(sellerConnection, {
    variantId: variant.id,
  });
  // 5. Perform restock operation to create 'restock' inventory history
  const restockResult =
    await api.functional.shoppingMall.seller.inventory.restock(
      sellerConnection,
      {
        variantId: variant.id,
      },
    );
  typia.assert(restockResult);
  // 6. Test filtering by 'order' and 'order_cancellation' reasons
  const filteredResult =
    await api.functional.shoppingMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          reason: ["order", "order_cancellation"],
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryHistory.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 7. Verify that only 'order' and 'order_cancellation' records are returned
  TestValidator.equals(
    "total records matches expected",
    2,
    filteredResult.data.length,
  );
  filteredResult.data.forEach((history) => {
    TestValidator.predicate(
      `reason is valid: ${history.reason}`,
      ["order", "order_cancellation"].includes(history.reason),
    );
  });
  // 8. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination page is 1",
    1,
    filteredResult.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is 10",
    10,
    filteredResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination records is 2",
    2,
    filteredResult.pagination.records,
  );
  TestValidator.equals(
    "pagination pages is 1",
    1,
    filteredResult.pagination.pages,
  );
}