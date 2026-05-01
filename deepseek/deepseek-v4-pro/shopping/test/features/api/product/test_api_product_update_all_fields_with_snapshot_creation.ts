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
 * Test product update with all fields changed and snapshot creation.
 *
 * Validates that an approved seller can update every core field of their product — name, description, base_price, and category — in a single PUT operation. The test confirms that the response reflects all new values and that the updated_at timestamp advances, indicating the atomic transaction completed successfully.
 *
 * The snapshot system is tested indirectly: a successful update with a newer updated_at timestamp confirms the server-side transaction (snapshot creation + product mutation) executed atomically. The snapshot itself captures the pre-update name, description, base_price, and category, plus any existing images and variants at that moment.
 *
 * 1. Administrator registers and creates two categories (initial and target).
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller creates a product assigned to the first category.
 * 4. Seller updates the product: new name, description, base_price, and second category.
 * 5. Validates the response preserves the product id, all fields match the update input, the category is the second one, and updated_at is newer than before.
 */
export async function test_api_product_update_all_fields_with_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category1 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category1);
  const category2 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category2);
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // 3. Seller creates product under first category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category1.id,
      },
    },
  );
  typia.assert(product);
  const originalUpdatedAt = product.updated_at;
  // 4. Update all fields — name, description, base_price, and category
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newBasePrice = (product.base_price + 100) satisfies number;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: newName,
        description: newDescription,
        shopping_mall_category_id: category2.id,
        base_price: newBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Validations
  TestValidator.equals("product id preserved", updatedProduct.id, product.id);
  TestValidator.equals("name updated", updatedProduct.name, newName);
  TestValidator.equals(
    "description updated",
    updatedProduct.description,
    newDescription,
  );
  TestValidator.equals(
    "base_price updated",
    updatedProduct.base_price,
    newBasePrice,
  );
  TestValidator.equals(
    "category changed to second category",
    updatedProduct.category.id,
    category2.id,
  );
  TestValidator.predicate(
    "updated_at timestamp advanced after update",
    updatedProduct.updated_at > originalUpdatedAt,
  );
}
