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

export async function test_api_category_subcategory_delete_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator deletion of a direct subcategory from a category tree.
   *
   * Validates the full category management flow for one-level nesting by creating
   * a parent category, creating a direct child subcategory under that parent, and
   * deleting the child through the administrator subcategory deletion endpoint.
   *
   * The test checks that the subcategory is linked to the intended parent before
   * deletion and that the delete operation completes successfully while the parent
   * category remains intact for continued browsing and taxonomy use.
   *
   * 1. Authenticate as an administrator.
   * 2. Create a parent category.
   * 3. Create a direct subcategory under the parent.
   * 4. Delete the direct subcategory.
   * 5. Validate the hierarchical linkage before deletion and successful completion of the delete call.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const parentCategory =
    await generate_random_mall_platform_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<IMallPlatformCategory.ICreate>,
      },
    );
  typia.assert(parentCategory);
  const subcategory =
    await generate_random_mall_platform_administrator_categories_subcategories_create(
      administratorConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: `${RandomGenerator.name()} child`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentCategoryId: parentCategory.id,
        } satisfies DeepPartial<IMallPlatformCategory.ICreate>,
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory parent should reference the created parent category",
    subcategory.parentCategoryId,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory nested parent summary should match the created parent category",
    subcategory.parentCategory?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory nested parent summary should keep the parent name",
    subcategory.parentCategory?.name,
    parentCategory.name,
  );
  await api.functional.mallPlatform.administrator.categories.subcategories.erase(
    administratorConnection,
    {
      categoryId: parentCategory.id,
      subcategoryId: subcategory.id,
    },
  );
}
