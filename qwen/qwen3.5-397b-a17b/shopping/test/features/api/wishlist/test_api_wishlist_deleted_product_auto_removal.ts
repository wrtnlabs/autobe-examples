import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

/**
 * Test that products deleted by sellers are automatically removed from customer wishlists.
 *
 * This test verifies the cascade delete behavior where soft-deleted products are
 * automatically excluded from wishlist queries. The test creates a customer and seller,
 * adds products to the customer's wishlist, deletes one product as the seller, and
 * validates that the deleted product no longer appears in the wishlist while other
 * products remain.
 */
export async function test_api_wishlist_deleted_product_auto_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create seller account and connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create first product (will be deleted)
  const product1 = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // 4. Create second product (will remain in wishlist)
  const product2 = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 5. Add both products to customer's wishlist
  const wishlist1 = await api.functional.shoppingMall.customer.wishlists.create(
    customerConnection,
    {
      body: {
        product_id: product1.id,
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist1);
  const wishlist2 = await api.functional.shoppingMall.customer.wishlists.create(
    customerConnection,
    {
      body: {
        product_id: product2.id,
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist2);
  // 6. Verify both products appear in wishlist (should have 2 items)
  const wishlistBefore =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistBefore);
  TestValidator.equals(
    "wishlist should have 2 items before deletion",
    wishlistBefore.pagination.records,
    2,
  );
  TestValidator.predicate(
    "product1 should be in wishlist",
    wishlistBefore.data.some((item) => item.product.id === product1.id),
  );
  TestValidator.predicate(
    "product2 should be in wishlist",
    wishlistBefore.data.some((item) => item.product.id === product2.id),
  );
  // 7. Delete product1 as seller
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product1.id,
  });
  // 8. Verify wishlist now has only 1 item (product1 auto-removed)
  const wishlistAfter =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistAfter);
  TestValidator.equals(
    "wishlist should have 1 item after deletion",
    wishlistAfter.pagination.records,
    1,
  );
  TestValidator.predicate(
    "product1 should NOT be in wishlist after deletion",
    !wishlistAfter.data.some((item) => item.product.id === product1.id),
  );
  TestValidator.predicate(
    "product2 should still be in wishlist",
    wishlistAfter.data.some((item) => item.product.id === product2.id),
  );
  // 9. Verify pagination metadata adjusted correctly
  TestValidator.equals(
    "pagination pages should be 1",
    wishlistAfter.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    wishlistAfter.pagination.current,
    1,
  );
}
