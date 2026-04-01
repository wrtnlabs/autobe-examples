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
 * Test the one-level nesting constraint for shopping mall categories.
 *
 * This test validates that subcategories cannot have their own subcategories,
 * enforcing a flat two-tier category structure (top-level categories and
 * subcategories only).
 *
 * Test flow:
 * 1. Register an administrator account
 * 2. Create a top-level parent category
 * 3. Create a subcategory under the parent
 * 4. Attempt to create a category under the subcategory (should fail)
 * 5. Verify the business logic error is thrown
 */
export async function test_api_category_one_level_nesting_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a top-level parent category (no parent_id)
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
        },
      },
    );
  typia.assert(parentCategory);
  TestValidator.predicate(
    "parent category has no parent",
    parentCategory.parent === null,
  );
  // 3. Create a subcategory under the parent category
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory parent matches",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // 4. Attempt to create a category under the subcategory (should fail)
  // This violates the one-level nesting constraint
  await TestValidator.error("subcategories cannot have children", async () => {
    await api.functional.shoppingMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          parent_id: subcategory.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  });
  // 5. Verify that creating another top-level category still works
  const anotherParent =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
        },
      },
    );
  typia.assert(anotherParent);
  TestValidator.predicate(
    "another top-level category has no parent",
    anotherParent.parent === null,
  );
}
