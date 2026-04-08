import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test that a seller can successfully update their own product.
 *
 * Validates the complete product update workflow including seller authentication, category creation by admin, product creation, and product update by the owner. Ensures that the update operation correctly modifies the product fields and that the updated_at timestamp is changed to reflect the modification.
 *
 * Special attention is given to verifying that only the seller who owns the product can update it, and that all modified fields (name, description, category, base_price) are correctly reflected in the response. The test also validates that the updated_at timestamp changes after the update operation.
 *
 * 1. Administrator registers and logs in to create a category.
 * 2. Seller registers and logs in to create and update a product.
 * 3. Admin creates a category for product assignment.
 * 4. Seller creates a product with initial name, description, category, and base price.
 * 5. Seller updates the product with new name, description, category, and base price.
 * 6. Validates the updated product has all new values and updated_at timestamp changed.
 * 7. Validates the original values are preserved for snapshot verification.
 */
export async function test_api_product_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminJoin);
  // 2. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  // 3. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(category);
  // 4. Seller creates a product
  const initialName = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.content({ paragraphs: 2 });
  const initialBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: initialName,
        description: initialDescription,
        shopping_mall_category_id: category.id,
        base_price: initialBasePrice,
      },
    },
  );
  typia.assert(product);
  // Store original values for validation
  const originalUpdatedAt = product.updated_at;
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  const originalCategoryId = product.category.id;
  // 5. Create a second category for update test
  const secondCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(secondCategory);
  // 6. Seller updates the product
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: updatedName,
        description: updatedDescription,
        shopping_mall_category_id: secondCategory.id,
        base_price: updatedBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 7. Validate updated product has new values
  TestValidator.equals("name updated", updatedProduct.name, updatedName);
  TestValidator.equals(
    "description updated",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "category updated",
    updatedProduct.category.id,
    secondCategory.id,
  );
  TestValidator.equals(
    "base_price updated",
    updatedProduct.base_price,
    updatedBasePrice,
  );
  // 8. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedProduct.updated_at,
    originalUpdatedAt,
  );
  // 9. Validate product ownership remains the same
  TestValidator.equals(
    "seller unchanged",
    updatedProduct.seller.id,
    product.seller.id,
  );
  // 10. Validate original values were different (ensuring update actually changed something)
  TestValidator.notEquals("name differs", originalName, updatedName);
  TestValidator.notEquals(
    "description differs",
    originalDescription,
    updatedDescription,
  );
  TestValidator.notEquals(
    "base_price differs",
    originalBasePrice,
    updatedBasePrice,
  );
  TestValidator.notEquals(
    "category differs",
    originalCategoryId,
    secondCategory.id,
  );
}
