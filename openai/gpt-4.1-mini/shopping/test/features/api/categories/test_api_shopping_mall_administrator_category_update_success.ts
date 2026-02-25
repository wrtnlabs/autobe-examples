import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create_category } from "../../../generate/generate_random_shopping_mall_administrator_categories_create_category";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_shopping_mall_administrator_category_update_success(
  connection: api.IConnection,
) {
  // Register a new administrator account and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(admin);
  // Use authorized connection with authentication token
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // Create a new product category to update
  const originalCategory =
    await generate_random_shopping_mall_administrator_categories_create_category(
      adminConnection,
      {
        body: {
          name: `original-${RandomGenerator.alphabets(12)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(originalCategory);
  // Prepare updated data with unique new name and new description
  const updatedName = `updated-${RandomGenerator.alphabets(12)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  // Call update category API
  const updatedCategory =
    await api.functional.shoppingMall.administrator.categories.updateCategory(
      adminConnection,
      {
        categoryId: originalCategory.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // Validate updated fields
  TestValidator.equals(
    "category id unchanged",
    updatedCategory.id,
    originalCategory.id,
  );
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    updatedDescription,
  );
  // Timestamps check: updatedAt should be newer than original
  TestValidator.predicate(
    "updatedAt refreshed",
    new Date(updatedCategory.updatedAt) > new Date(originalCategory.updatedAt),
  );
  // Validate that no subcategories altered - subcategories not returned in detail, so parentCategoryId unchanged
  TestValidator.equals(
    "parentCategoryId unchanged",
    updatedCategory.parentCategoryId ?? null,
    originalCategory.parentCategoryId ?? null,
  );
  // Authorization enforcement - try update with unauthenticated connection
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated category update should fail",
    async () => {
      await api.functional.shoppingMall.administrator.categories.updateCategory(
        unauthConnection,
        {
          categoryId: originalCategory.id,
          body: {
            name: `fail-${RandomGenerator.alphabets(12)}`,
            description: "Should not update",
          },
        },
      );
    },
  );
}
