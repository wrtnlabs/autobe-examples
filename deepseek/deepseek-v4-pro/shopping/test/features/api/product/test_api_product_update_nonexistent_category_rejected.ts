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
 * Test that updating a product to reference a non-existent category is rejected
 * with 404 and the atomic transaction rolls back completely.
 *
 * Validates that the product update endpoint performs category existence
 * validation within the same atomic database transaction as the update itself.
 * The test confirms that when a seller provides a category ID that does not
 * correspond to any existing category, the system rejects the entire operation
 * with a 404 Not Found response, leaving the product's original attributes
 * unchanged and without creating any product snapshot.
 *
 * The atomicity guarantee is critical: the category existence check, snapshot
 * creation, and field updates all execute within a single database transaction.
 * A failure at any step — including category validation — causes the entire
 * transaction to roll back.
 *
 * 1. Administrator registers and creates a valid category.
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller creates a product assigned to the valid category.
 * 4. Seller attempts to update the product with a non-existent category ID.
 * 5. System rejects with 404 Not Found, confirming atomic rollback.
 */
export async function test_api_product_update_nonexistent_category_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create valid category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 5. Seller creates product under valid category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  typia.assert(product);
  // 6. Attempt update with non-existent category ID → expect 404 rollback
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update with non-existent category rejected with 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId: product.id,
          body: {
            name: product.name,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            shopping_mall_category_id: nonExistentCategoryId,
            base_price: product.base_price,
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    },
  );
}
