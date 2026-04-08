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

export async function test_api_customer_wishlist_listing_happy_path(
  connection: api.IConnection,
): Promise<void> {
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
  // 2. Create seller account and login
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
  // 3. Create multiple products for the seller
  const products = await ArrayUtil.asyncRepeat(5, async () => {
    const product = await generate_random_ecommerce_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceProduct.ICreate,
      },
    );
    typia.assert(product);
    return product;
  });
  // 4. Add products to customer's wishlist
  const wishlistItems = await ArrayUtil.asyncRepeat(3, async (index) => {
    const item =
      await generate_random_ecommerce_customer_wishlists_items_create(
        customerConnection,
        {
          body: {
            ecommerce_product_id: products[index].id,
          } satisfies IEcommerceWishlistItem.ICreate,
          params: {
            wishlistId: customer.id,
          },
        },
      );
    typia.assert(item);
    return item;
  });
  // 5. List wishlist with pagination
  const wishlistListing =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: {
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistListing);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", wishlistListing.pagination.current, 1);
  TestValidator.equals("limit", wishlistListing.pagination.limit, 10);
  TestValidator.equals("total records", wishlistListing.pagination.records, 3);
  TestValidator.predicate("has pages", wishlistListing.pagination.pages > 0);
  // 7. Validate wishlist items count
  TestValidator.equals("wishlist items count", wishlistListing.data.length, 3);
  // 8. Validate each wishlist item has product details
  await ArrayUtil.asyncForEach(wishlistListing.data, async (item) => {
    TestValidator.predicate("has product", item.product !== null);
    TestValidator.predicate("has product id", item.product.id.length > 0);
    TestValidator.predicate("has product name", item.product.name.length > 0);
    TestValidator.predicate("has product price", item.product.base_price > 0);
    TestValidator.predicate("has created_at", item.created_at.length > 0);
  });
  // 9. Validate sorting (newest first)
  if (wishlistListing.data.length > 1) {
    const firstCreated = new Date(wishlistListing.data[0].created_at).getTime();
    const secondCreated = new Date(
      wishlistListing.data[1].created_at,
    ).getTime();
    TestValidator.predicate("sorted descending", firstCreated >= secondCreated);
  }
}
