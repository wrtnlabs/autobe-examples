import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformWishlistItem";
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
import { generate_random_ecommerce_platform_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_platform_customer_wishlist_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_wishlist_item } from "../../../prepare/prepare_random_ecommerce_platform_wishlist_item";

/**
 * Test that a customer can view their saved products in the wishlist list with current product details.
 *
 * Validates the complete wishlist workflow including seller product creation, customer registration, and wishlist operations. Ensures that products saved to a customer's wishlist are correctly retrieved via the paginated wishlist endpoint with accurate product details.
 *
 * Special attention is given to verifying that the product summary in the wishlist response reflects the current product state, confirming that wishlist items store live product references rather than static snapshots.
 *
 * 1. Seller joins the platform and creates a product with name, description, category, and base price.
 * 2. Customer joins the platform with unique email credentials.
 * 3. Customer adds the product to their wishlist.
 * 4. Customer retrieves their wishlist via PATCH /ecommercePlatform/customer/wishlist.
 * 5. Validates that the product appears in the wishlist data array with correct details and pagination reflects one saved item.
 */
export async function test_api_wishlist_list_added_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // 2. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  // 4. Customer adds product to wishlist
  const wishlistItem =
    await generate_random_ecommerce_platform_customer_wishlist_create(
      customerConnection,
      {
        body: { product_id: product.id },
      },
    );
  typia.assert(wishlistItem);
  TestValidator.equals(
    "wishlist product matches",
    wishlistItem.product.id,
    product.id,
  );
  // 5. Customer retrieves wishlist via PATCH
  const wishlistList =
    await api.functional.ecommercePlatform.customer.wishlist.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommercePlatformWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistList);
  // 6. Validate results
  TestValidator.equals("wishlist has one item", wishlistList.data.length, 1);
  TestValidator.equals(
    "pagination records is 1",
    wishlistList.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages is 1",
    wishlistList.pagination.pages,
    1,
  );
  TestValidator.equals(
    "wishlist item product id matches",
    wishlistList.data[0].product.id,
    product.id,
  );
  TestValidator.equals(
    "wishlist item product name matches",
    wishlistList.data[0].product.name,
    product.name,
  );
  TestValidator.equals(
    "wishlist item product price matches",
    wishlistList.data[0].product.basePrice,
    product.base_price,
  );
  TestValidator.predicate(
    "wishlist item has created_at",
    () => wishlistList.data[0].created_at !== undefined,
  );
}
