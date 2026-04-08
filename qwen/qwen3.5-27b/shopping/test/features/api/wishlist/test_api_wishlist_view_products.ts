import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerWishlist";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_customer_wishlist } from "../../../prepare/prepare_random_shopping_mall_customer_wishlist";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test viewing a customer's wishlist with product details and pagination.
 *
 * Validates the complete wishlist viewing flow including customer authentication, seller product creation, wishlist entry creation, and paginated retrieval. Ensures that the wishlist correctly displays product information including seller details, pricing, and availability status.
 *
 * Special attention is given to verifying that product summaries include all required fields for list display, seller shop information is correctly joined, and pagination metadata accurately reflects the total count of wishlist entries.
 *
 * 1. Customer registers and authenticates to the shopping mall platform.
 * 2. Seller registers and authenticates to create products.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Customer adds the product to their wishlist.
 * 5. Customer retrieves their wishlist with pagination.
 * 6. Validates wishlist entry contains product summary with all required fields.
 * 7. Validates pagination metadata shows correct record counts.
 */
export async function test_api_wishlist_view_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Customer adds product to wishlist
  const wishlistEntry =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      {
        body: {
          productId: product.id,
        },
      },
    );
  typia.assert(wishlistEntry);
  // 5. Customer retrieves wishlist with pagination
  const wishlistPage =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCustomerWishlist.IRequest,
      },
    );
  typia.assert(wishlistPage);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    wishlistPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", wishlistPage.pagination.limit, 20);
  TestValidator.equals(
    "pagination total records",
    wishlistPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination total pages",
    wishlistPage.pagination.pages,
    1,
  );
  // 7. Validate wishlist entry exists
  TestValidator.predicate("wishlist has data", wishlistPage.data.length > 0);
  const entry = wishlistPage.data[0];
  typia.assert(entry);
  // 8. Validate wishlist entry contains product summary
  TestValidator.equals("wishlist entry id matches", entry.id, wishlistEntry.id);
  TestValidator.equals("product id matches", entry.product.id, product.id);
  TestValidator.equals(
    "product name matches",
    entry.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base price matches",
    entry.product.base_price,
    product.base_price,
  );
  // 9. Validate seller information is present
  TestValidator.predicate(
    "seller has shop_name",
    entry.product.seller.seller_profile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    entry.created_at.length > 0,
  );
  // 10. Validate product availability status
  TestValidator.predicate(
    "in_stock is boolean",
    typeof entry.product.in_stock === "boolean",
  );
}
