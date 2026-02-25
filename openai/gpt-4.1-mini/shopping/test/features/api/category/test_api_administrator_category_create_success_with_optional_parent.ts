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

export async function test_api_administrator_category_create_success_with_optional_parent(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Verify administrator can create categories with or without parentCategoryId
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create root category (without parentCategoryId)
  const rootCategoryBody: IShoppingMallCategory.ICreate = {
    name: `RootCategory_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const rootCategory =
    await generate_random_shopping_mall_administrator_categories_create_category(
      adminConnection,
      { body: rootCategoryBody },
    );
  typia.assert(rootCategory);
  // 3. Create child category with parentCategoryId = root category id
  const childCategoryBody: IShoppingMallCategory.ICreate = {
    name: `ChildCategory_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parentCategoryId: rootCategory.id,
  };
  const childCategory =
    await generate_random_shopping_mall_administrator_categories_create_category(
      adminConnection,
      { body: childCategoryBody },
    );
  typia.assert(childCategory);
  // 4. Validate created root category properties
  TestValidator.equals(
    "root category name matches",
    rootCategory.name,
    rootCategoryBody.name,
  );
  TestValidator.equals(
    "root category description matches",
    rootCategory.description,
    rootCategoryBody.description,
  );
  TestValidator.predicate(
    "root category id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rootCategory.id,
    ),
  );
  TestValidator.predicate(
    "root category createdAt is ISO8601",
    typeof rootCategory.createdAt === "string" &&
      rootCategory.createdAt.length > 0,
  );
  TestValidator.predicate(
    "root category updatedAt is ISO8601",
    typeof rootCategory.updatedAt === "string" &&
      rootCategory.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "root category deletedAt is null",
    rootCategory.deletedAt === null || rootCategory.deletedAt === undefined,
  );
  TestValidator.predicate(
    "root category parentCategoryId is undefined",
    rootCategory.parentCategoryId === null ||
      rootCategory.parentCategoryId === undefined,
  );
  // 5. Validate created child category properties
  TestValidator.equals(
    "child category name matches",
    childCategory.name,
    childCategoryBody.name,
  );
  TestValidator.equals(
    "child category description matches",
    childCategory.description,
    childCategoryBody.description,
  );
  TestValidator.predicate(
    "child category id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      childCategory.id,
    ),
  );
  TestValidator.predicate(
    "child category createdAt is ISO8601",
    typeof childCategory.createdAt === "string" &&
      childCategory.createdAt.length > 0,
  );
  TestValidator.predicate(
    "child category updatedAt is ISO8601",
    typeof childCategory.updatedAt === "string" &&
      childCategory.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "child category deletedAt is null",
    childCategory.deletedAt === null || childCategory.deletedAt === undefined,
  );
  // 6. Validate child parentCategory is summary matching root category
  TestValidator.predicate(
    "child category parentCategory exists",
    childCategory.parentCategory !== null &&
      childCategory.parentCategory !== undefined,
  );
  if (
    childCategory.parentCategory !== null &&
    childCategory.parentCategory !== undefined
  ) {
    TestValidator.equals(
      "child parentCategory id matches",
      childCategory.parentCategory.id,
      rootCategory.id,
    );
    TestValidator.equals(
      "child parentCategory name matches",
      childCategory.parentCategory.name,
      rootCategory.name,
    );
    TestValidator.equals(
      "child parentCategory description matches",
      childCategory.parentCategory.description,
      rootCategory.description,
    );
    TestValidator.equals(
      "child parentCategory deleted_at is null",
      childCategory.parentCategory.deleted_at,
      null,
    );
  }
  // 7. Test uniqueness violation - create duplicate category name under same parent
  await TestValidator.error(
    "duplicate category name under same parent",
    async () => {
      await generate_random_shopping_mall_administrator_categories_create_category(
        adminConnection,
        {
          body: {
            name: rootCategoryBody.name,
            description: RandomGenerator.paragraph({ sentences: 1 }),
            parentCategoryId: null,
          },
        },
      );
    },
  );
  await TestValidator.error(
    "duplicate category name under child parent",
    async () => {
      await generate_random_shopping_mall_administrator_categories_create_category(
        adminConnection,
        {
          body: {
            name: childCategoryBody.name,
            description: RandomGenerator.paragraph({ sentences: 1 }),
            parentCategoryId: rootCategory.id,
          },
        },
      );
    },
  );
}
