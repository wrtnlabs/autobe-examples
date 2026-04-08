import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceWishlistItem";
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
import { generate_random_ecommerce_customer_wishlists_items_create } from "../../../generate/generate_random_ecommerce_customer_wishlists_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_wishlist_item } from "../../../prepare/prepare_random_ecommerce_wishlist_item";

export async function test_api_customer_wishlist_empty_and_deleted_products(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer wishlist edge cases with empty state and deleted products.
   *
   * Validates wishlist behavior when products are deleted by sellers and when the wishlist is empty. Ensures cascade deletion properly removes wishlist items when their referenced products no longer exist.
   *
   * The test verifies automatic cleanup of wishlist items when products are deleted, proper pagination metadata for empty results, and that customers only see currently available products in their wishlist.
   *
   * 1. Create customer and seller accounts with random credentials.
   * 2. Seller creates two products for wishlist testing.
   * 3. Customer adds both products to their wishlist.
   * 4. Verify wishlist contains both items with correct pagination.
   * 5. Seller deletes first product.
   * 6. Verify wishlist automatically removes deleted product item.
   * 7. Seller deletes second product.
   * 8. Verify wishlist is empty with zero count and valid pagination metadata.
   */
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create products as seller
  const product1 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product2);
  // 4. Add products to customer's wishlist
  const wishlistItem1 =
    await generate_random_ecommerce_customer_wishlists_items_create(
      customerConnection,
      {
        body: {
          ecommerce_product_id: product1.id,
        } satisfies IEcommerceWishlistItem.ICreate,
        params: { wishlistId: customer.id },
      },
    );
  typia.assert(wishlistItem1);
  const wishlistItem2 =
    await generate_random_ecommerce_customer_wishlists_items_create(
      customerConnection,
      {
        body: {
          ecommerce_product_id: product2.id,
        } satisfies IEcommerceWishlistItem.ICreate,
        params: { wishlistId: customer.id },
      },
    );
  typia.assert(wishlistItem2);
  // 5. Verify wishlist has 2 items
  const wishlistWithItems =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: { limit: 10 } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistWithItems);
  TestValidator.equals(
    "wishlist has 2 items",
    wishlistWithItems.data.length,
    2,
  );
  TestValidator.equals(
    "total count is 2",
    wishlistWithItems.pagination.records,
    2,
  );
  // 6. Delete one product
  await api.functional.ecommerce.seller.products.erase(sellerConnection, {
    productId: product1.id,
  });
  // 7. Verify wishlist now has only 1 item (deleted product removed)
  const wishlistAfterDelete =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: { limit: 10 } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistAfterDelete);
  TestValidator.equals(
    "wishlist has 1 item after delete",
    wishlistAfterDelete.data.length,
    1,
  );
  TestValidator.equals(
    "total count is 1",
    wishlistAfterDelete.pagination.records,
    1,
  );
  TestValidator.predicate(
    "remaining item is product2",
    wishlistAfterDelete.data[0].product.id === product2.id,
  );
  // 8. Delete second product
  await api.functional.ecommerce.seller.products.erase(sellerConnection, {
    productId: product2.id,
  });
  // 9. Verify wishlist is now empty
  const wishlistEmpty = await api.functional.ecommerce.customer.wishlists.index(
    customerConnection,
    {
      body: { limit: 10 } satisfies IEcommerceWishlistItem.IRequest,
    },
  );
  typia.assert(wishlistEmpty);
  TestValidator.equals("wishlist is empty", wishlistEmpty.data.length, 0);
  TestValidator.equals("total count is 0", wishlistEmpty.pagination.records, 0);
  TestValidator.equals("pages is 0", wishlistEmpty.pagination.pages, 0);
}
