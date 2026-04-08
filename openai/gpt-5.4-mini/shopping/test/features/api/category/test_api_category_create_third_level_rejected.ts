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

export async function test_api_category_create_third_level_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test rejection of third-level category creation under the one-level nesting rule.
   *
   * Validates that administrators can create top-level categories and direct subcategories,
   * but cannot create a category beneath an existing subcategory. This preserves the
   * platform's one-level category hierarchy constraint and ensures no new category is
   * persisted when the request violates the nesting rule.
   *
   * 1. Register and authenticate an administrator using an isolated connection.
   * 2. Create a top-level category and a direct subcategory under it.
   * 3. Attempt to create a third-level category using the direct subcategory as parent.
   * 4. Verify the request is rejected and the original hierarchy remains unchanged.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const topLevel =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `top-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentCategoryId: null,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(topLevel);
  const subLevel =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `sub-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentCategoryId: topLevel.id,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(subLevel);
  TestValidator.equals(
    "top-level category has no parent",
    topLevel.parentCategoryId,
    null,
  );
  TestValidator.equals(
    "direct subcategory parent is the top-level category",
    subLevel.parentCategoryId,
    topLevel.id,
  );
  await TestValidator.httpError(
    "third-level category creation should be rejected",
    [400, 403, 409, 422],
    async () => {
      await generate_random_mall_platform_administrator_categories_create(
        adminConnection,
        {
          body: {
            name: `third-${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parentCategoryId: subLevel.id,
          } satisfies IMallPlatformCategory.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "top-level category remains unchanged after rejection",
    topLevel.parentCategoryId,
    null,
  );
  TestValidator.equals(
    "direct subcategory remains unchanged after rejection",
    subLevel.parentCategoryId,
    topLevel.id,
  );
}
