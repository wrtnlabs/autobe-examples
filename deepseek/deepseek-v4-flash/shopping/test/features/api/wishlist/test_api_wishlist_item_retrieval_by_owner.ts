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
 * Test that a customer can successfully retrieve their own wishlist item by its unique identifier, verifying all fields including live product data are returned.
 *
 * Validates the complete wishlist item retrieval flow from administrative product setup through customer authentication and wishlist management. Ensures that the wishlist item is correctly associated with the authenticated customer and that the embedded product data reflects the live product state.
 *
 * 1. Seller registers as a seller via the auth join endpoint and creates a product.
 * 2. Customer registers as a customer via the auth join endpoint.
 * 3. Customer adds the seller's product to their wishlist via the wishlist create endpoint.
 * 4. Customer retrieves the wishlist item by its unique identifier.
 * 5. Validates that the retrieved wishlist item matches the created item, customer reference matches the authenticated customer, product reference matches the original product, and metadata timestamps are present with deleted_at being null.
 */
export async function test_api_wishlist_item_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  // Customer adds product to wishlist
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
  // 3. Retrieve the wishlist item
  const retrieved = typia.assert(
    await api.functional.eCommerceMall.customer.wishlist_items.at(
      customerConnection,
      {
        wishlistItemId: wishlistItem.id,
      },
    ),
  );
  // 4. Business logic validations
  TestValidator.equals("wishlist item id", retrieved.id, wishlistItem.id);
  TestValidator.equals(
    "customer id",
    retrieved.customer.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "customer email",
    retrieved.customer.email,
    customerAuthorized.email,
  );
  TestValidator.equals("product id", retrieved.product.id, product.id);
  TestValidator.predicate("created_at exists", () => !!retrieved.created_at);
  TestValidator.predicate("updated_at exists", () => !!retrieved.updated_at);
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
