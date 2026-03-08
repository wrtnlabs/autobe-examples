import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_wishlists_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlists_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

/**
 * Test that administrators can access customer wishlist entries for support and dispute resolution purposes.
 *
 * Setup Steps:
 * 1. Create a customer account via POST /ecommerceMall/auth/customer/join
 * 2. Create a seller account via POST /ecommerceMall/auth/seller/join
 * 3. Create a category via POST /ecommerceMall/admin/categories
 * 4. Create a product via POST /ecommerceMall/seller/products
 * 5. Add the product to customer's wishlist via POST /ecommerceMall/customer/wishlists
 * 6. Create an administrator account via POST /ecommerceMall/auth/admin/join
 *
 * Test Steps:
 * 1. Authenticate as the administrator (not the wishlist owner)
 * 2. Call GET /ecommerceMall/customer/wishlists/{wishlistId} with the customer's wishlist entry ID
 * 3. Verify the response contains the complete product information
 * 4. Verify administrator access is logged for audit trail
 *
 * Validation Points:
 * - Response status code is 200 OK (administrator bypasses ownership check)
 * - All product information is returned correctly
 * - Administrator access is logged for audit trail
 * - Administrator cannot modify the wishlist entry (read-only access)
 * - The operation respects the same response structure as customer access
 *
 * Edge Case:
 * - Test that non-administrator customers cannot access other customers' wishlist entries (403 Forbidden)
 */
export async function test_api_wishlist_entry_administrator_access_for_dispute(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create category (admin operation)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create product (seller operation)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Type<"double"> & tags.Minimum<0>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Add product to customer's wishlist (customer operation)
  const wishlistEntry =
    await generate_random_ecommerce_mall_customer_wishlists_create(
      customerConnection,
      {
        body: {
          ecommerce_mall_product_id: product.id,
        } satisfies IEcommerceMallWishlist.ICreate,
      },
    );
  typia.assert(wishlistEntry);
  // 6. Administrator accesses the customer's wishlist entry (should succeed)
  const adminAccessedWishlist: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.customer.wishlists.at(adminConnection, {
      wishlistId: wishlistEntry.id,
    });
  typia.assert(adminAccessedWishlist);
  // 7. Validate administrator can read the wishlist entry
  TestValidator.equals(
    "wishlist ID matches",
    adminAccessedWishlist.id,
    wishlistEntry.id,
  );
  TestValidator.equals(
    "product ID matches",
    adminAccessedWishlist.product.id,
    product.id,
  );
  TestValidator.equals(
    "customer ID matches",
    adminAccessedWishlist.customer.id,
    customerAuth.id,
  );
  TestValidator.predicate(
    "product has name",
    adminAccessedWishlist.product.name.length > 0,
  );
  TestValidator.predicate(
    "product has main image",
    adminAccessedWishlist.product.mainImageUrl.length > 0,
  );
  TestValidator.predicate(
    "customer has email",
    adminAccessedWishlist.customer.email.length > 0,
  );
  TestValidator.predicate(
    "wishlist entry is active",
    adminAccessedWishlist.active === true,
  );
  // 8. Test that non-administrator customer cannot access another customer's wishlist entry (edge case)
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(anotherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await TestValidator.httpError(
    "non-admin cannot access other customer's wishlist",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.wishlists.at(
        anotherCustomerConnection,
        {
          wishlistId: wishlistEntry.id,
        },
      );
    },
  );
}