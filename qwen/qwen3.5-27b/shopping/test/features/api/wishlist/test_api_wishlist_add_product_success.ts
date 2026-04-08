import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a customer can successfully add a product to their wishlist.
 *
 * Validates the complete wishlist creation flow including seller product setup, customer authentication, and product addition to wishlist. Ensures that the wishlist entry correctly references the product and contains all product details.
 *
 * Special attention is given to verifying that the product information is correctly maintained in the wishlist entry and that the entry has valid metadata including timestamps and null deleted_at status.
 *
 * 1. Seller registers and authenticates via /shoppingMall/auth/seller/join.
 * 2. Seller creates a product with name, description, and base_price.
 * 3. Customer registers and authenticates via /shoppingMall/auth/customer/join.
 * 4. Customer adds the product to their wishlist via POST /shoppingMall/customer/wishlists.
 * 5. Validates wishlist entry contains correct product reference and metadata.
 */
export async function test_api_wishlist_add_product_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Add product to wishlist
  const wishlistEntry =
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          productId: product.id,
        } satisfies IShoppingMallCustomerWishlist.ICreate,
      },
    );
  typia.assert(wishlistEntry);
  // 4. Validate wishlist entry
  TestValidator.equals(
    "product ID matches",
    wishlistEntry.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    wishlistEntry.product.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    wishlistEntry.product.description,
    product.description,
  );
  TestValidator.predicate(
    "has valid created_at",
    wishlistEntry.created_at !== null,
  );
  TestValidator.predicate(
    "has valid updated_at",
    wishlistEntry.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", wishlistEntry.deleted_at, null);
}
