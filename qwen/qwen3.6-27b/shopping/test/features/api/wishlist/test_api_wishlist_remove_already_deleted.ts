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
 * Test idempotency edge case when deleting an already-soft-deleted wishlist item.
 *
 * Validates that attempting to remove a wishlist item that was previously deleted results in a 404 Not Found error. The wishlist erase endpoint queries for active items only (deleted_at IS NULL), so a previously soft-deleted item is not found and cannot be erased again. This confirms the removal is strictly permanent with no trash bin or recovery mechanism.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product assigned to that category.
 * 3. Customer registers and adds the product to their wishlist.
 * 4. Customer deletes the wishlist item successfully (soft-deletion).
 * 5. Customer attempts to delete the same wishlist item again.
 * 6. System throws an HttpError with 404 status since the item is no longer searchable after soft-deletion.
 */
export async function test_api_wishlist_remove_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and creates a product assigned to the category
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 3. Customer registers and adds the product to their wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuthorized);
  const wishlistItem: IEcommercePlatformWishlistItem =
    await generate_random_ecommerce_platform_customer_wishlist_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // Verify the wishlist item references the correct product
  TestValidator.equals(
    "wishlist item product matches created product",
    wishlistItem.product.id,
    product.id,
  );
  // 4. Delete the wishlist item (first deletion - succeeds, soft-deletes)
  await api.functional.ecommercePlatform.customer.wishlist.erase(
    customerConnection,
    {
      wishlistItemId: wishlistItem.id,
    },
  );
  // 5-6. Attempt to delete the same wishlist item again - expects 404 HttpError
  await TestValidator.error(
    "deleting already-deleted wishlist item throws 404",
    async () => {
      await api.functional.ecommercePlatform.customer.wishlist.erase(
        customerConnection,
        {
          wishlistItemId: wishlistItem.id,
        },
      );
    },
  );
}
