import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test creating a new top-level category as an administrator.
 *
 * Validates the complete category creation workflow including administrator authentication, category creation with unique name and description, and duplicate name conflict detection. Ensures that top-level categories are created without a parent_category_id and that the system enforces name uniqueness among top-level categories.
 *
 * Special attention is given to verifying the category structure, timestamps, and the conflict handling when attempting to create duplicate category names.
 *
 * 1. Authenticate as an administrator using the join endpoint to obtain access tokens.
 * 2. Create a new top-level category with a unique name and description (no parent_category_id provided).
 * 3. Verify the response contains the created category with generated UUID id, provided name and description, created_at and updated_at timestamps, deleted_at is NULL, and empty subcategories array.
 * 4. Verify the category name is unique among top-level categories by attempting to create another category with the same name - should fail with 409 Conflict.
 */
export async function test_api_category_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create a new top-level category
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        },
      },
    );
  typia.assert(category);
  // 3. Verify the created category structure
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryDescription,
  );
  TestValidator.predicate(
    "category has UUID id",
    /^[0-9a-f-]{36}$/i.test(category.id),
  );
  TestValidator.predicate("deleted_at is null", category.deleted_at === null);
  TestValidator.equals(
    "subcategories array is empty",
    category.subcategories.length,
    0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(category.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(category.updated_at),
  );
  // 4. Verify duplicate name conflict
  await TestValidator.httpError(
    "duplicate category name returns 409",
    409,
    async () => {
      await generate_random_shopping_mall_administrator_categories_create(
        adminConnection,
        {
          body: {
            name: categoryName,
            description: "This should fail due to duplicate name",
          },
        },
      );
    },
  );
}
