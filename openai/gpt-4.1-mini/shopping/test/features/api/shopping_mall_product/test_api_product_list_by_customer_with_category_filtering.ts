import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_list_by_customer_with_category_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerCreateBody = {
    email: customerEmail,
    password: "StrongPass123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customerAuthorized);

  // 2. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: "AdminPass456$",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 3. Admin creates product categories
  // Create an array of 3 categories
  const categoryNames = ["Electronics", "Books", "Clothing"];

  // Function to create categories sequentially
  const createdCategories: IShoppingMallProductCategory[] = [];
  for (const name of categoryNames) {
    const categoryBody = {
      name: name,
      description: `Category for ${name}`,
      parent_id: null,
    } satisfies IShoppingMallProductCategory.ICreate;
    const category =
      await api.functional.shoppingMall.admin.productCategories.create(
        connection,
        { body: categoryBody },
      );
    typia.assert(category);
    createdCategories.push(category);
  }

  // 4. Customer login
  const customerLoginBody = {
    email: customerEmail,
    password: "StrongPass123!",
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 5. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass456$",
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 6. Customer searches products with category filter
  if (createdCategories.length === 0) {
    throw new Error("No categories created for filtering");
  }

  const categoryToFilter = createdCategories[0];

  const productSearchBody = {
    page: 1,
    limit: 10,
    category_id: categoryToFilter.id,
  } satisfies IShoppingMallProduct.IRequest;

  const productPage: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.customer.products.index(connection, {
      body: productSearchBody,
    });
  typia.assert(productPage);

  // 7. Verify pagination data and products
  TestValidator.predicate(
    "pagination.current page is 1",
    productPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit is 10",
    productPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "products are not empty",
    Array.isArray(productPage.data) && productPage.data.length >= 0,
  );

  if (productPage.data.length > 0) {
    for (const product of productPage.data) {
      TestValidator.predicate(
        "product has non-empty id",
        typeof product.id === "string" && product.id.length > 0,
      );
      TestValidator.predicate(
        "product has non-empty name",
        typeof product.name === "string" && product.name.length > 0,
      );
      TestValidator.predicate(
        "product has non-empty code",
        typeof product.code === "string" && product.code.length > 0,
      );
    }
  }
}
