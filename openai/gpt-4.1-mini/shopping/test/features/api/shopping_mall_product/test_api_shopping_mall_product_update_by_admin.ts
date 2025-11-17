import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join - create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        ip: null,
        href: "https://localhost/",
        referrer: "https://localhost/referrer",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin login to ensure session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      ip: null,
      href: "https://localhost/",
      referrer: "https://localhost/referrer",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Create a valid category for product update
  const categoryName = RandomGenerator.alphaNumeric(8);
  const categoryDescription = RandomGenerator.content({ paragraphs: 1 });
  const categoryStatus = "active";

  const category: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          status: categoryStatus,
        } satisfies IShoppingMallShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Update product by productCode
  // Generate dummy productCode string
  const productCode = RandomGenerator.alphaNumeric(12);

  // Product update details
  const productTitle = RandomGenerator.paragraph({ sentences: 3 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const productBrand = RandomGenerator.name(1);
  const productUpdateBody = {
    title: productTitle,
    description: productDescription,
    brand: productBrand,
    shopping_mall_category_id: category.id,
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.shoppingMallProducts.update(
      connection,
      {
        productCode: productCode,
        body: productUpdateBody,
      },
    );
  typia.assert(updatedProduct);

  // 5. Validate updated product's properties
  TestValidator.equals(
    "updated product code",
    updatedProduct.code,
    productCode,
  );
  TestValidator.equals(
    "updated product title",
    updatedProduct.title,
    productTitle,
  );
  TestValidator.equals(
    "updated product description",
    updatedProduct.description ?? null,
    productDescription,
  );
  TestValidator.equals(
    "updated product brand",
    updatedProduct.brand ?? null,
    productBrand,
  );
  TestValidator.equals(
    "updated product category id",
    updatedProduct.shopping_mall_category.id,
    category.id,
  );
  TestValidator.equals(
    "updated product category name",
    updatedProduct.shopping_mall_category.name,
    category.name,
  );
}
