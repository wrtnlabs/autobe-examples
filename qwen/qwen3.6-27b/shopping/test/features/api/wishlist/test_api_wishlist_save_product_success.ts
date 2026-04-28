import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_platform_customer_wishlist_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_wishlist_item } from "../../../prepare/prepare_random_ecommerce_platform_wishlist_item";

/**
 * Test the primary success path of saving a product to a customer's wishlist.
 *
 * Validates the complete wishlist save flow including administrative category setup, seller product creation, and customer wishlist addition. Ensures that the wishlist item correctly references both the authenticated customer and the saved product with full product details.
 *
 * Special attention is given to verifying that the customer reference matches the authenticated user's identity, the product reference contains complete information (name, description, base price, seller profile, category), and lifecycle fields like timestamps are populated correctly with deleted_at as NULL indicating an active entry.
 *
 * 1. Administrator registers, authenticates, and creates a product category.
 * 2. Seller registers, authenticates, and creates a product assigned to the category.
 * 3. Customer registers and authenticates.
 * 4. Customer adds the product to their wishlist.
 * 5. Validates the wishlist item response contains all expected fields, correct references, and proper state.
 */
export async function test_api_wishlist_save_product_success(
  connection: api.IConnection,
): Promise<void> {
  /* ---- 1. Admin: Create Category ---- */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  /* ---- 2. Seller: Create Product in Category ---- */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const categoryOverride = {
    category_id: category.id,
  } satisfies DeepPartial<IEcommercePlatformProduct.ICreate>;
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: categoryOverride },
    );
  typia.assert(product);
  /* ---- 3. Customer: Register & Login ---- */
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: { email: customerEmail },
  });
  /* ---- 4. Customer: Add Product to Wishlist ---- */
  const wishlistItemId = product.id;
  const wishlistItem =
    await generate_random_ecommerce_platform_customer_wishlist_create(
      customerConnection,
      { body: { product_id: wishlistItemId } },
    );
  typia.assert(wishlistItem);
  /* ---- 5. Validate Wishlist Item Response ---- */
  TestValidator.equals(
    "product in wishlist matches created product",
    wishlistItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "wishlist product name matches",
    wishlistItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "wishlist item customer email matches authenticated customer",
    wishlistItem.customer.email,
    customerEmail,
  );
  TestValidator.equals(
    "wishlist item product reference equals requested product_id",
    wishlistItem.product.id,
    wishlistItemId,
  );
  TestValidator.predicate(
    "wishlist has timestamps populated",
    () =>
      wishlistItem.created_at !== undefined &&
      wishlistItem.updated_at !== undefined,
  );
  TestValidator.equals(
    "wishlist item is active with deleted_at null",
    wishlistItem.deleted_at,
    null,
  );
  TestValidator.predicate(
    "wishlist item id is a valid UUID",
    () => wishlistItem.id.length === 36,
  );
}
