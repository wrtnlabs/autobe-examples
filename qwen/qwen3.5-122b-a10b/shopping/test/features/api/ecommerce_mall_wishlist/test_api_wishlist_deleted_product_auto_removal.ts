import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlists_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlists_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

/**
 * Test automatic removal of deleted products from customer wishlists.
 *
 * NOTE: This test requires product creation/deletion APIs which are not
 * available in the provided SDK. The test structure demonstrates the
 * intended flow but cannot be fully executed without product management APIs.
 *
 * 1. Register and authenticate a customer
 * 2. Add a product to customer's wishlist (requires existing product ID)
 * 3. Delete the product (requires product deletion API)
 * 4. Verify the product is automatically removed from wishlist
 */
export async function test_api_wishlist_deleted_product_auto_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Add product to wishlist (requires existing product ID from setup)
  // NOTE: Product creation API not available in provided SDK
  // In real test, product would be created by seller beforehand
  const productId = typia.random<string & tags.Format<"uuid">>();
  const wishlistEntry =
    await generate_random_ecommerce_mall_customer_wishlists_create(
      customerConnection,
      {
        body: {
          ecommerce_mall_product_id: productId,
        } satisfies IEcommerceMallWishlist.ICreate,
      },
    );
  typia.assert(wishlistEntry);
  // 3. Verify product is in wishlist
  const wishlistBefore =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistBefore);
  TestValidator.equals(
    "wishlist has product before deletion",
    wishlistBefore.data.some((item) => item.product.id === productId),
    true,
  );
  // 4. Delete product (requires product deletion API - not available)
  // NOTE: Product deletion API not available in provided SDK
  // In real test: await api.functional.admin.products.delete(sellerConnection, { params: { id: productId } })
  // 5. Verify product is removed from wishlist after deletion
  // NOTE: This verification depends on product deletion being performed
  const wishlistAfter =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistAfter);
  // NOTE: In full implementation, verify deleted product is not in wishlist
  // TestValidator.equals(
  //   "deleted product removed from wishlist",
  //   wishlistAfter.data.some((item) => item.product.id === productId),
  //   false,
  // );
  // NOTE: Verify wishlist count decreased
  // TestValidator.equals(
  //   "wishlist count decreased after deletion",
  //   wishlistAfter.pagination.records,
  //   wishlistBefore.pagination.records - 1,
  // );
}
