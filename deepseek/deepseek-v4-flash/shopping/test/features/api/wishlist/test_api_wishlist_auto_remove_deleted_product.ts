import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallWishlistItem";
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
import { generate_random_e_commerce_mall_customer_wishlist_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_wishlist_items_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_auto_remove_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer adds the product to wishlist
  const wishlistItem =
    await generate_random_e_commerce_mall_customer_wishlist_items_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        },
      },
    );
  typia.assert(wishlistItem);
  TestValidator.equals(
    "wishlist item product matches",
    wishlistItem.product.id,
    product.id,
  );
  // 5. List wishlist items - expect 1 item
  const listBefore =
    await api.functional.eCommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(listBefore);
  TestValidator.equals(
    "wishlist has 1 item before deletion",
    listBefore.pagination.records,
    1,
  );
  TestValidator.equals("wishlist data has 1 item", listBefore.data.length, 1);
  // 6. Seller deletes the product
  await api.functional.eCommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 7. List wishlist items again - expect 0 items
  const listAfter =
    await api.functional.eCommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(listAfter);
  TestValidator.equals(
    "wishlist has 0 items after product deletion",
    listAfter.pagination.records,
    0,
  );
  TestValidator.equals("wishlist data is empty", listAfter.data.length, 0);
}
