import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_category_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (signs up) and obtains authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "securePa$word123",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin login to refresh authentication token
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://localhost/login",
    referrer: "https://localhost/",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Admin creates a product category to be updated
  const createCategoryBody: IShoppingMallProductCategory.ICreate = {
    parent_id: null,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  };
  const createdCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: createCategoryBody,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category name matches",
    createdCategory.name,
    createCategoryBody.name,
  );

  // 4. Admin creates a sibling category to test uniqueness among siblings on update
  const siblingCategoryBody: IShoppingMallProductCategory.ICreate = {
    parent_id: null,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const siblingCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: siblingCategoryBody,
      },
    );
  typia.assert(siblingCategory);
  TestValidator.predicate(
    "sibling category has different name",
    siblingCategory.name !== createdCategory.name,
  );

  // 5. Admin updates the initial created category
  const updateCategoryBody: IShoppingMallProductCategory.IUpdate = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 7,
      wordMin: 5,
      wordMax: 10,
    }),
    // Set parent_id to siblingCategory id to test updated parent assignment
    parent_id: siblingCategory.id,
  };
  const updatedCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.update(
      connection,
      {
        id: createdCategory.id,
        body: updateCategoryBody,
      },
    );
  typia.assert(updatedCategory);

  TestValidator.equals(
    "updated category id unchanged",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "updated category name matches",
    updatedCategory.name,
    updateCategoryBody.name,
  );
  TestValidator.equals(
    "updated category description matches",
    updatedCategory.description,
    updateCategoryBody.description,
  );
  TestValidator.equals(
    "updated category parent_id matches sibling category id",
    updatedCategory.parent_id,
    updateCategoryBody.parent_id,
  );

  // 6. Attempt to update the category's name to the sibling category name, expecting a uniqueness constraint error
  await TestValidator.error(
    "updating category name to sibling's name violates uniqueness",
    async () => {
      await api.functional.shoppingMall.admin.productCategories.update(
        connection,
        {
          id: createdCategory.id,
          body: {
            name: siblingCategory.name,
            description: updateCategoryBody.description,
            parent_id: siblingCategory.parent_id ?? null,
          } satisfies IShoppingMallProductCategory.IUpdate,
        },
      );
    },
  );
}
