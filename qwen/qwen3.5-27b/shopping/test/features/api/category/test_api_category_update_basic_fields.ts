import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_update_basic_fields(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for updating a category's basic fields (name and description).
   * Validates that administrators can modify category information while preserving ID and hierarchy.
   */
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a top-level category
  const originalCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(originalCategory);
  // 3. Prepare update data with new name and description
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallCategory.IUpdate;
  // 4. Update the category
  const updatedCategory =
    await api.functional.shoppingMall.admin.admin.categories.update(
      adminConnection,
      {
        categoryId: originalCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate the update results
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    updateBody.name,
  );
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    updateBody.description,
  );
  TestValidator.equals(
    "category ID unchanged",
    updatedCategory.id,
    originalCategory.id,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedCategory.updated_at) >=
      new Date(originalCategory.created_at),
  );
  TestValidator.equals(
    "subcategories array is empty",
    updatedCategory.subcategories,
    [],
  );
  TestValidator.equals(
    "parent is null for top-level category",
    updatedCategory.parent,
    null,
  );
}
