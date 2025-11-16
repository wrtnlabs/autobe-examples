import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test scenario: Platform admin can permanently delete any product from
 * catalog.
 *
 * 1. Register and authenticate an admin
 * 2. Admin creates a product in the catalog
 * 3. Admin can permanently erase product by productId
 * 4. Re-erasing the same product fails (product not found/was already deleted)
 */
export async function test_api_product_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string,
        name: adminName satisfies string,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email correct", admin.email, adminEmail);

  // 2. Admin creates a product
  const createProductInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    default_price: 10000,
    business_status: "draft",
  } satisfies IShoppingMallProduct.ICreate;
  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: createProductInput,
    });
  typia.assert(createdProduct);
  TestValidator.equals(
    "created product title",
    createdProduct.title,
    createProductInput.title,
  );
  TestValidator.equals(
    "created product status",
    createdProduct.business_status,
    createProductInput.business_status,
  );

  // 3. Permanently erase the product using admin endpoint
  await api.functional.shoppingMall.admin.products.erase(connection, {
    productId: createdProduct.id,
  });

  // 4. Attempt to erase the same product again; should result in error
  await TestValidator.error(
    "re-erasing already deleted product should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.erase(connection, {
        productId: createdProduct.id,
      });
    },
  );
}
