import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test successful administrator-initiated product erasure for policy violation enforcement.
 *
 * This test validates that an administrator can permanently remove a product from
 * the platform for policy violation enforcement. The deletion process soft-deletes
 * the product and all associated variants, inventory records, and removes the product
 * from wishlists. The mandatory reason field provides audit documentation.
 *
 * Workflow:
 * 1. Create administrator account and authenticate
 * 2. Create a category (required for product creation)
 * 3. Create seller account and authenticate
 * 4. Seller creates a product
 * 5. Administrator erases the product with policy violation reason
 * 6. Validate successful deletion by verifying re-deletion fails
 */
export async function test_api_product_policy_violation_erasure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a category for the product
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Policy_Test_Category_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 3. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates a product that will be subject to administrative erasure
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product_For_Policy_Removal_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Store product ID for deletion
  const productId: string & tags.Format<"uuid"> = product.id;
  // 5. Administrator erases the product with policy violation reason
  // The reason must be 1-500 characters for audit trail documentation
  const eraseReason: string =
    "Product removed due to intellectual property violation - trademark infringement detected in product listing";
  await api.functional.shoppingMall.seller.products.erase(adminConnection, {
    productId,
    body: {
      reason: eraseReason,
    } satisfies IShoppingMallProduct.IErase,
  });
  // 6. Validate deletion was successful by verifying re-deletion fails
  // (Cannot delete an already deleted product - returns 404 Not Found)
  await TestValidator.error(
    "cannot delete already deleted product",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(adminConnection, {
        productId,
        body: {
          reason: "Attempting to delete already removed product",
        } satisfies IShoppingMallProduct.IErase,
      });
    },
  );
}
