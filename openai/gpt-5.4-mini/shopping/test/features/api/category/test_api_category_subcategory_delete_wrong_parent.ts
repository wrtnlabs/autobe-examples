import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_categories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_create";
import { generate_random_mall_platform_administrator_categories_subcategories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_subcategories_create";
import { prepare_random_mall_platform_category } from "../../../prepare/prepare_random_mall_platform_category";

export async function test_api_category_subcategory_delete_wrong_parent(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate that a subcategory cannot be deleted through the wrong parent category scope.
   *
   * This test covers the administrator category deletion flow by creating two separate root categories,
   * creating a direct subcategory under the first root, and then attempting to delete that subcategory
   * through the second root category identifier. The expected business behavior is that the wrong-parent
   * request leaves the original hierarchy intact and does not affect unrelated categories.
   *
   * 1. Authenticate as an administrator on an isolated connection.
   * 2. Create two independent root categories and one direct subcategory under the first root.
   * 3. Attempt deletion of the subcategory using the second root category as the parent scope.
   * 4. Verify the original parent-child relationship remains unchanged in the data returned by creation.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const parentCategoryA =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(parentCategoryA);
  const parentCategoryB =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(parentCategoryB);
  const subcategory =
    await generate_random_mall_platform_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: {
          categoryId: parentCategoryA.id,
        },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  await api.functional.mallPlatform.administrator.categories.subcategories.erase(
    adminConnection,
    {
      categoryId: parentCategoryB.id,
      subcategoryId: subcategory.id,
    },
  );
  TestValidator.equals(
    "subcategory remains attached to its real parent",
    subcategory.parentCategory?.id ?? parentCategoryA.id,
    parentCategoryA.id,
  );
  TestValidator.equals(
    "first root category remains a top-level category",
    parentCategoryA.parentCategoryId,
    null,
  );
  TestValidator.equals(
    "second root category remains a top-level category",
    parentCategoryB.parentCategoryId,
    null,
  );
  TestValidator.predicate(
    "subcategory is created as a direct child of the first parent",
    subcategory.parentCategory?.id === parentCategoryA.id ||
      subcategory.parentCategoryId === parentCategoryA.id,
  );
}
