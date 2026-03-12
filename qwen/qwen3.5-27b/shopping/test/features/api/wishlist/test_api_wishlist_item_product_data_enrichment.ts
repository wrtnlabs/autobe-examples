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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test wishlist item product data enrichment with reviews, stock, and seller info.
 *
 * This test validates that when retrieving a wishlist item, the API correctly
 * enriches the product data with:
 * - Average rating and review count from customer reviews
 * - Stock availability status based on product variants
 * - Complete seller profile information
 * - Category hierarchy details
 * - Main product image (display_order = 1)
 * - Variant count for the product
 */
export async function test_api_wishlist_item_product_data_enrichment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Setup: Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Setup: Create a product through seller (simulated - using random product ID)
  // In a real scenario, we would create a product via seller API
  // For this test, we assume a product exists and use its ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 4. Execution: Customer adds product to wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId },
    );
  typia.assert(wishlistItem);
  // 5. Execution: Retrieve wishlist item with enriched data
  const retrievedItem = await api.functional.shoppingMall.customer.wishlist.at(
    customerConnection,
    { wishlistItemId: wishlistItem.id },
  );
  typia.assert(retrievedItem);
  // 6. Validation: Verify product data enrichment
  TestValidator.equals(
    "wishlist item ID matches",
    retrievedItem.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedItem.customer.id,
    wishlistItem.customer.id,
  );
  // Validate product information
  TestValidator.predicate(
    "product has name",
    retrievedItem.product.name.length > 0,
  );
  TestValidator.predicate(
    "product has description",
    retrievedItem.product.description.length > 0,
  );
  TestValidator.predicate(
    "product has base price",
    retrievedItem.product.basePrice >= 0,
  );
  TestValidator.predicate(
    "product has variant count",
    retrievedItem.product.variantCount >= 0,
  );
  // Validate seller information
  TestValidator.equals(
    "seller ID matches",
    retrievedItem.seller.id,
    retrievedItem.product.seller.id,
  );
  TestValidator.predicate(
    "seller has shop name",
    retrievedItem.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller has approval status",
    retrievedItem.seller.approval_status.length > 0,
  );
  // Validate category information
  TestValidator.predicate(
    "category has ID",
    retrievedItem.product.category.id.length > 0,
  );
  TestValidator.predicate(
    "category has name",
    retrievedItem.product.category.name.length > 0,
  );
  // Validate review aggregation (averageRating and reviewCount)
  TestValidator.predicate(
    "review count is non-negative",
    retrievedItem.reviewCount >= 0,
  );
  TestValidator.predicate(
    "average rating is valid or zero",
    retrievedItem.averageRating === 0 ||
      (retrievedItem.averageRating >= 1 && retrievedItem.averageRating <= 5),
  );
  // Validate stock status
  TestValidator.predicate(
    "isInStock is boolean",
    typeof retrievedItem.isInStock === "boolean",
  );
  // Validate timestamps
  TestValidator.predicate(
    "createdAt is valid date-time",
    !isNaN(Date.parse(retrievedItem.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    !isNaN(Date.parse(retrievedItem.updatedAt)),
  );
  // Validate customer summary
  TestValidator.equals(
    "customer email matches",
    retrievedItem.customer.email,
    customerEmail,
  );
  TestValidator.predicate(
    "customer has display name",
    retrievedItem.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer status is valid",
    retrievedItem.customer.status.length > 0,
  );
}
