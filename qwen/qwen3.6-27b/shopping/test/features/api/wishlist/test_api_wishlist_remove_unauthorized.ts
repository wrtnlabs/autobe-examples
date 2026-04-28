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
 * Test authorization enforcement preventing an unauthorized customer from removing another
 * customer's wishlist item.
 *
 * Validates that the DELETE /ecommercePlatform/customer/wishlist/{wishlistItemId} endpoint
 * checks ownership by comparing the authenticated customer's ID against the
 * ecommerce_platform_customer_id field in the wishlist item. When Customer B attempts to
 * remove a wishlist item belonging to Customer A, the operation must immediately reject
 * with 403 Forbidden, enforcing strict data isolation between customer accounts.
 *
 * Covers the complete multi-actor setup flow including administrative category creation,
 * seller product creation, and customer authentication.
 *
 * 1. Authenticate as admin and create a product category.
 * 2. Authenticate as seller and create a product assigned to the category.
 * 3. Authenticate as Customer A and add the product to their wishlist.
 * 4. Authenticate as Customer B and attempt to remove Customer A's wishlist item.
 * 5. Verify the system returns 403 Forbidden for the unauthorized removal attempt.
 */
export async function test_api_wishlist_remove_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  /* 1. Admin setup - create category */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  /* 2. Seller setup - create product */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  /* 3. Customer A setup - add product to wishlist */
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  const wishlistItem =
    await generate_random_ecommerce_platform_customer_wishlist_create(
      customerAConnection,
      { body: { product_id: product.id } },
    );
  typia.assert(wishlistItem);
  /* 4. Customer B setup - attempt unauthorized removal */
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  /* 5. Validate 403 Forbidden for cross-customer deletion */
  await TestValidator.httpError(
    "customer B cannot remove customer A's wishlist item",
    403,
    async () =>
      await api.functional.ecommercePlatform.customer.wishlist.erase(
        customerBConnection,
        { wishlistItemId: wishlistItem.id },
      ),
  );
}
