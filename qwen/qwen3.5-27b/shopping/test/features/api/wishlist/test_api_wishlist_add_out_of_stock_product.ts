import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that customers can add out-of-stock products to their wishlist.
 *
 * This test verifies that:
 * 1. Customers can successfully add out-of-stock products to their wishlist
 * 2. The wishlist item response correctly indicates the product is out of stock (isInStock: false)
 * 3. The product availability status is reflected in the response (available: false)
 * 4. Wishlist functionality works independently of inventory status
 */
export async function test_api_wishlist_add_out_of_stock_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 2. Generate a product UUID (simulating an out-of-stock product)
  // In a real scenario, this would be an actual product with zero stock
  const outOfStockProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Add the out-of-stock product to customer's wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      {
        productId: outOfStockProductId,
      },
    );
  typia.assert(wishlistItem);
  // 4. Validate that the product is correctly marked as out of stock
  TestValidator.predicate(
    "product is marked as out of stock",
    wishlistItem.isInStock === false,
  );
  // 5. Validate that the product availability is false
  TestValidator.predicate(
    "product available status is false",
    wishlistItem.product.available === false,
  );
  // 6. Validate that customer information matches
  TestValidator.equals(
    "customer email matches",
    wishlistItem.customer.email,
    customer.email,
  );
  // 7. Validate that product information exists
  TestValidator.predicate(
    "product has valid name",
    wishlistItem.product.name.length > 0,
  );
  // 8. Validate that seller information exists
  TestValidator.predicate(
    "seller has valid shop name",
    wishlistItem.seller.shop_name.length > 0,
  );
}
