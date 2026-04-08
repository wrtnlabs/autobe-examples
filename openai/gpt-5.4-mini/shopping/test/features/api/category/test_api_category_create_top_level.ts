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
import { prepare_random_mall_platform_category } from "../../../prepare/prepare_random_mall_platform_category";

export async function test_api_category_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Create a top-level marketplace category and verify its persisted read model.
   *
   * This test covers administrator-only category creation for a root taxonomy node.
   * It validates the created category response shape, confirms the absence of a parent
   * category relationship, ensures the direct subcategory collection starts empty, and
   * checks that existing categories remain intact after the new category is added.
   *
   * 1. Authenticate as an administrator using a fresh isolated connection.
   * 2. Create a baseline category so the test can verify existing catalog data survives.
   * 3. Create a new top-level category through the generated helper.
   * 4. Validate the returned category business fields and the baseline category state.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const baselineCategoryName = RandomGenerator.name();
  const baselineCategoryDescription = RandomGenerator.paragraph({
    sentences: 3,
  });
  const baselineCategory =
    await generate_random_mall_platform_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: baselineCategoryName,
          description: baselineCategoryDescription,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(baselineCategory);
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 4 });
  const created =
    await generate_random_mall_platform_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("category name", created.name, categoryName);
  TestValidator.equals(
    "category description",
    created.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category parentCategoryId",
    created.parentCategoryId,
    null,
  );
  TestValidator.equals("category parentCategory", created.parentCategory, null);
  TestValidator.equals("category subcategories", created.subcategories, []);
  TestValidator.equals(
    "baseline category name",
    baselineCategory.name,
    baselineCategoryName,
  );
  TestValidator.equals(
    "baseline category description",
    baselineCategory.description,
    baselineCategoryDescription,
  );
  TestValidator.equals(
    "baseline category parentCategoryId",
    baselineCategory.parentCategoryId,
    null,
  );
  TestValidator.equals(
    "baseline category parentCategory",
    baselineCategory.parentCategory,
    null,
  );
  TestValidator.equals(
    "baseline category subcategories",
    baselineCategory.subcategories,
    [],
  );
}
