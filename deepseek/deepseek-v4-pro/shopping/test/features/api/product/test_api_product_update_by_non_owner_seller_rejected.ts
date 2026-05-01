import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a non-owner seller is rejected when attempting to update a product.
 *
 * Validates ownership-based access control for the product update endpoint. An administrator creates a category and approves two different sellers. The first seller creates a product, then the second seller — who is also approved but does not own the product — attempts to update it with valid field values.
 *
 * The system must reject the request with 403 Forbidden, confirming that only the original product creator may modify it. The 403 response ensures the entire request is rejected with no partial update applied.
 *
 * 1. Administrator registers and authenticates.
 * 2. Administrator creates a product category.
 * 3. First seller registers and is approved by the administrator.
 * 4. First seller creates a product under the category.
 * 5. Second seller registers and is approved by the administrator.
 * 6. Second seller attempts to update the first seller's product — expect 403 Forbidden.
 */
export async function test_api_product_update_by_non_owner_seller_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. First seller register and approve
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1);
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller1.id,
  });
  // 4. First seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Second seller register and approve
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2);
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller2.id,
  });
  // 6. Second seller attempts to update first seller's product → 403 Forbidden
  await TestValidator.httpError(
    "non-owner seller cannot update product",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        seller2Connection,
        {
          productId: product.id,
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 2 }),
            shopping_mall_category_id: category.id,
            base_price: (product.base_price + 1000) satisfies number as number,
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    },
  );
}
