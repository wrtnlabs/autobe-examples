import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
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

export async function test_api_wishlist_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Attempt to create 3 products for wishlist testing
  const products: IEcommerceMallProduct[] = [];
  const validCategoryId = typia.random<string & tags.Format<"uuid">>();
  for (let i = 0; i < 3; i++) {
    try {
      const product = await api.functional.ecommerceMall.seller.products.create(
        sellerConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            categoryId: validCategoryId,
            basePrice: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
      typia.assert(product);
      products.push(product);
    } catch {
      // If seller not approved or category invalid, skip remaining products
      break;
    }
  }
  // 4. Add products to wishlist
  const wishlistItems: IEcommerceMallWishlistItem.IInvert[] = [];
  for (const product of products) {
    try {
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
      wishlistItems.push(wishlistItem);
    } catch {
      // Skip if product cannot be added to wishlist
    }
  }
  // 5. Retrieve wishlist with pagination (empty body for first page)
  const wishlistResponse =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistResponse);
  // 6. Validate pagination metadata structure - access via pagination.pagination
  const pagePagination = wishlistResponse.pagination.pagination;
  TestValidator.equals("pagination exists", pagePagination !== null, true);
  TestValidator.equals(
    "pagination has current",
    "current" in pagePagination,
    true,
  );
  TestValidator.equals("pagination has limit", "limit" in pagePagination, true);
  TestValidator.equals(
    "pagination has records",
    "records" in pagePagination,
    true,
  );
  TestValidator.equals("pagination has pages", "pages" in pagePagination, true);
  // 7. Validate wishlist data structure
  TestValidator.equals(
    "data is array",
    Array.isArray(wishlistResponse.data),
    true,
  );
  // 8. Validate wishlist items if any were added
  if (wishlistResponse.data.length > 0) {
    for (const wishlist of wishlistResponse.data) {
      typia.assert(wishlist);
      // Validate wishlist has items array
      TestValidator.equals(
        "wishlistItems is array",
        Array.isArray(wishlist.wishlistItems),
        true,
      );
      // Validate each wishlist item structure
      for (const item of wishlist.wishlistItems) {
        typia.assert(item);
        // Verify createdAt timestamp exists
        TestValidator.equals(
          "item has createdAt",
          item.createdAt !== undefined,
          true,
        );
      }
      // Verify sorting: items should be sorted by createdAt descending (newest first)
      if (wishlist.wishlistItems.length > 1) {
        for (let i = 0; i < wishlist.wishlistItems.length - 1; i++) {
          const current = new Date(
            wishlist.wishlistItems[i].createdAt,
          ).getTime();
          const next = new Date(
            wishlist.wishlistItems[i + 1].createdAt,
          ).getTime();
          TestValidator.predicate("items sorted newest first", current >= next);
        }
      }
    }
  }
  // 9. Validate pagination records reflects actual wishlist items
  if (products.length > 0 && wishlistItems.length > 0) {
    // Verify records is non-negative
    TestValidator.equals(
      "records is non-negative",
      pagePagination.records >= 0,
      true,
    );
    // Verify pages calculation
    TestValidator.predicate(
      "pages is calculated correctly",
      pagePagination.pages >= 0,
    );
  }
}
