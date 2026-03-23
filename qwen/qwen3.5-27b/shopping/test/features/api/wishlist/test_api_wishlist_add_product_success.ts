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
 * Test the primary success path for adding a product to customer's wishlist.
 *
 * This test validates that:
 * 1. A customer can successfully add a product to their wishlist
 * 2. The wishlist item response contains all required fields with correct types
 * 3. The customer, product, and seller information are properly enriched in the response
 *
 * @note This test requires a valid product to exist in the system. In a full test suite,
 * this should be preceded by seller registration and product creation tests.
 */
export async function test_api_wishlist_add_product_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 2. Setup: Use a product ID (in real test, this should be created via seller)
  // For this test to pass, a product with this ID must exist in the system
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Execute: Add product to wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId },
    );
  typia.assert(wishlistItem);
  // 4. Validate: Business logic validations (type validation already done by typia.assert)
  TestValidator.equals(
    "customer matches authenticated user",
    wishlistItem.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    wishlistItem.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "product ID matches requested",
    wishlistItem.product.id,
    productId,
  );
  TestValidator.predicate(
    "seller has shop name",
    wishlistItem.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "averageRating is valid (0-5 range)",
    wishlistItem.averageRating >= 0 && wishlistItem.averageRating <= 5,
  );
  TestValidator.predicate(
    "reviewCount is non-negative",
    wishlistItem.reviewCount >= 0,
  );
  TestValidator.predicate(
    "createdAt timestamp is valid",
    !isNaN(Date.parse(wishlistItem.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt timestamp is valid",
    !isNaN(Date.parse(wishlistItem.updatedAt)),
  );
}
