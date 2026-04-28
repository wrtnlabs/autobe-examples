import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformWishlistItem";
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
import { generate_random_ecommerce_platform_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_platform_customer_wishlist_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_wishlist_item } from "../../../prepare/prepare_random_ecommerce_platform_wishlist_item";

export async function test_api_wishlist_excludes_deleted_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins platform
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {} as DeepPartial<IEcommercePlatformSeller.IJoin>,
  });
  // 2. Seller creates a product
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Customer joins platform
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {} as DeepPartial<IEcommercePlatformCustomer.IJoin>,
  });
  // 4. Customer adds product to wishlist
  const wishlistItem: IEcommercePlatformWishlistItem =
    await generate_random_ecommerce_platform_customer_wishlist_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } as DeepPartial<IEcommercePlatformWishlistItem.ICreate>,
      },
    );
  typia.assert(wishlistItem);
  // 5. Verify product appears in wishlist before deletion
  const wishlistBefore: IPageIEcommercePlatformWishlistItem.ISummary =
    await api.functional.ecommercePlatform.customer.wishlist.index(
      customerConnection,
      {
        body: {} as DeepPartial<IEcommercePlatformWishlistItem.IRequest>,
      },
    );
  typia.assert(wishlistBefore);
  // Validate product exists in wishlist before deletion
  TestValidator.predicate(
    "product appears in wishlist before deletion",
    ArrayUtil.has(
      wishlistBefore.data,
      (item) => item.product.id === product.id,
    ),
  );
  // 6. Seller deletes the product
  await api.functional.ecommercePlatform.seller.products.erase(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  // 7. Verify deleted product no longer appears in wishlist
  const wishlistAfter: IPageIEcommercePlatformWishlistItem.ISummary =
    await api.functional.ecommercePlatform.customer.wishlist.index(
      customerConnection,
      {
        body: {} as DeepPartial<IEcommercePlatformWishlistItem.IRequest>,
      },
    );
  typia.assert(wishlistAfter);
  // Validate deleted product is excluded from results
  TestValidator.predicate(
    "deleted product is excluded from wishlist",
    !ArrayUtil.has(
      wishlistAfter.data,
      (item) => item.product.id === product.id,
    ),
  );
  // Validate pagination records reflects only available products
  TestValidator.predicate(
    "wishlist contains no products after deletion",
    wishlistAfter.pagination.records === 0,
  );
}
