import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_add_product_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create a product listing
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Add the product to the customer's wishlist
  const wishlistItem =
    await api.functional.ecommerceMall.customer.wishlist.create(
      customerConnection,
      {
        body: {
          productId: product.id,
        } satisfies IEcommerceMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  // 5. Verify wishlist item has valid UUID identifier
  TestValidator.equals(
    "wishlist item has valid UUID",
    wishlistItem.id.length === 36,
    true,
  );
  // 6. Verify wishlist item references correct product
  TestValidator.equals(
    "product ID matches",
    wishlistItem.product.id,
    product.id,
  );
  // 7. Verify product summary information is included
  TestValidator.equals(
    "product name matches",
    wishlistItem.product.name,
    product.name,
  );
  TestValidator.predicate(
    "category information is included",
    wishlistItem.product.category !== undefined &&
      wishlistItem.product.category !== null,
  );
  TestValidator.predicate(
    "thumbnail URL is included",
    wishlistItem.product.thumbnailUrl !== undefined &&
      wishlistItem.product.thumbnailUrl !== null,
  );
  TestValidator.predicate(
    "stock status is included",
    typeof wishlistItem.product.hasStock === "boolean",
  );
  // 8. Verify parent wishlist context is included
  TestValidator.equals(
    "wishlist ID is valid UUID",
    wishlistItem.wishlist.id.length === 36,
    true,
  );
  TestValidator.equals(
    "customer ID matches",
    wishlistItem.wishlist.customer.id,
    customer.id,
  );
  // 9. Verify createdAt timestamp is set correctly
  TestValidator.predicate(
    "createdAt is ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(wishlistItem.createdAt),
  );
  TestValidator.equals(
    "createdAt is recent",
    new Date(wishlistItem.createdAt).getTime() <= Date.now(),
    true,
  );
}
