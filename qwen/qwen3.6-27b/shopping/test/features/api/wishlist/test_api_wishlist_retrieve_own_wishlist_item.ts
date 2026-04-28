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
 * Test customer retrieval of their own wishlist item by ID.
 *
 * Validates the complete wishlist item retrieval flow including administrative category setup, seller product creation, customer wishlist addition, and authenticated retrieval. Ensures that the retrieved wishlist item correctly references the product and confirms customer ownership through the customer relationship.
 *
 * The test verifies that the wishlist item contains all expected fields including the product details (name, description, base price, seller profile, category), metadata timestamps (created_at, updated_at), and that deleted_at is NULL indicating an active wishlist entry.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins and creates a product in the created category.
 * 3. Customer joins and adds the product to their wishlist, creating a wishlist item.
 * 4. Customer retrieves the wishlist item by its unique ID.
 * 5. Validates that the retrieved item matches the created wishlist item, contains correct customer and product references, and has expected metadata.
 */
export async function test_api_wishlist_retrieve_own_wishlist_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins and creates a product in the created category
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 3. Customer joins and adds the product to their wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const wishlistItem =
    await generate_random_ecommerce_platform_customer_wishlist_create(
      customerConnection,
      {
        body: { product_id: product.id },
      },
    );
  typia.assert(wishlistItem);
  // 4. Customer retrieves the wishlist item by its ID
  const retrieved = await api.functional.ecommercePlatform.customer.wishlist.at(
    customerConnection,
    {
      wishlistItemId: wishlistItem.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate response
  TestValidator.equals(
    "wishlist item ID matches",
    retrieved.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "customer ownership confirmed - customer ID matches",
    retrieved.customer.id,
    wishlistItem.customer.id,
  );
  TestValidator.equals(
    "product ID matches the wishlist item's product",
    retrieved.product.id,
    wishlistItem.product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrieved.product.name,
    wishlistItem.product.name,
  );
  TestValidator.predicate(
    "product has non-negative base price",
    retrieved.product.basePrice >= 0,
  );
  TestValidator.equals(
    "deleted_at is null for active entry",
    retrieved.deleted_at,
    null,
  );
}
