import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_item_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections per connection isolation pattern
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Register admin account
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller account
  await authorize_seller_join(sellerConnection, {});
  // 3. Register customer account
  await authorize_customer_join(customerConnection, {});
  // 4. Create category as admin (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 6. Add product to wishlist (first call to target operation)
  const firstWishlistItem =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies Partial<IEcommerceMallWishlistItem.ICreate>,
      },
    );
  typia.assert(firstWishlistItem);
  // 7. Add same product to wishlist again (second call - should return existing)
  const secondWishlistItem =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies Partial<IEcommerceMallWishlistItem.ICreate>,
      },
    );
  typia.assert(secondWishlistItem);
  // 8. Validate duplicate prevention - both calls return the same wishlist item
  TestValidator.equals(
    "First and second wishlist calls return same item ID",
    firstWishlistItem.id,
    secondWishlistItem.id,
  );
  // 9. Validate timestamps remain unchanged (no new entry created)
  TestValidator.equals(
    "CreatedAt timestamp matches original",
    firstWishlistItem.createdAt,
    secondWishlistItem.createdAt,
  );
  TestValidator.equals(
    "UpdatedAt timestamp matches original",
    firstWishlistItem.updatedAt,
    secondWishlistItem.updatedAt,
  );
  // 10. Validate product reference consistency
  TestValidator.equals(
    "Product reference remains consistent",
    firstWishlistItem.product.id,
    secondWishlistItem.product.id,
  );
}
