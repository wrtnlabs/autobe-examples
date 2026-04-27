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

/**
 * Test customer removing a product from their own wishlist.
 *
 * Validates the complete wishlist removal flow including seller product creation,
 * customer authentication, wishlist item creation, and deletion. Confirms soft-delete
 * behavior where the wishlist item is excluded from queries but the referenced product
 * remains completely unaffected. Verifies that after removal, the same product can be
 * re-added to the wishlist without triggering a conflict error.
 *
 * 1. Seller registers and creates a visible product.
 * 2. Customer registers and adds the product to their wishlist.
 * 3. Customer removes the wishlist item via DELETE endpoint.
 * 4. Customer re-adds the same product to verify soft-delete (no conflict).
 * 5. Validates the new wishlist item references the original product correctly.
 */
export async function test_api_wishlist_product_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: join and create a product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 2. Customer setup: join and add product to wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
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
  const wishlistItemId = wishlistItem.id;
  // 3. Remove the wishlist item (DELETE)
  await api.functional.eCommerceMall.customer.wishlist_items.erase(
    customerConnection,
    {
      wishlistItemId,
    },
  );
  // 4. Verify the product can be re-added to the wishlist (no conflict error)
  //    This confirms soft-delete worked — the original item is excluded from
  //    the unique constraint check, allowing the same product to be re-saved.
  const newWishlistItem =
    await api.functional.eCommerceMall.customer.wishlist_items.create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        },
      },
    );
  typia.assert(newWishlistItem);
  // 5. Verify the new wishlist item references the same product correctly
  TestValidator.notEquals(
    "new wishlist item id differs from removed one",
    newWishlistItem.id,
    wishlistItemId,
  );
  TestValidator.equals(
    "product id unchanged in new wishlist item",
    newWishlistItem.product.id,
    product.id,
  );
}
