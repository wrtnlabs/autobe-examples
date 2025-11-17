import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_category_update_by_admin(
  connection: api.IConnection,
) {
  // STEP 1: Register a new customer as prerequisite
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "1234";
  const customerAuthorities: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "http://localhost/",
        referrer: "http://localhost/referrer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuthorities);

  // STEP 2: Customer creates a shopping mall category for update testing
  const categoryNameToCreate = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const createBody = {
    name: categoryNameToCreate,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 15,
      wordMax: 30,
    }),
    status: "active",
  } satisfies IShoppingMallShoppingMallCategory.ICreate;
  const createdCategory: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category name matches",
    createdCategory.name,
    createBody.name,
  );
  TestValidator.equals(
    "created category status is active",
    createdCategory.status,
    "active",
  );

  // STEP 3: Admin join and login to obtain authorized admin session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "http://localhost/admin/",
    referrer: "http://localhost/admin/referrer",
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "http://localhost/admin/login/",
    referrer: "http://localhost/admin/login/referrer",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // STEP 4: Admin updates the created category with new details
  // Prepare updated fields - must include name, description (nullable or string), and status
  const updateBody = {
    name: createdCategory.name, // original category name is the identifier
    status: RandomGenerator.pick(["active", "inactive"] as const),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 10,
      wordMax: 20,
    }),
  } satisfies IShoppingMallShoppingMallCategory.IUpdate;

  const updatedCategory: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMallCategories.update(
      connection,
      {
        categoryName: createdCategory.name,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  TestValidator.equals(
    "updated category name remains the same",
    updatedCategory.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated category status matches input",
    updatedCategory.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated category description matches input",
    updatedCategory.description,
    updateBody.description,
  );
}
