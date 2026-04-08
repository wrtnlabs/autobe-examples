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
 * Test creating a subcategory under an existing top-level category and validating the one-level nesting constraint.
 *
 * This test validates the complete subcategory creation workflow including administrator authentication, parent category setup, subcategory creation, and enforcement of the one-level nesting structure. The system must prevent creating subcategories under subcategories (nested subcategories).
 *
 * Special attention is given to verifying that the subcategory's subcategories array is empty and that attempting to create a nested subcategory fails with appropriate error handling.
 *
 * 1. Authenticate as administrator using the join endpoint to obtain access tokens.
 * 2. Create a top-level parent category with unique name and description.
 * 3. Create a subcategory with parent_category_id referencing the parent category.
 * 4. Verify the subcategory response contains correct fields and empty subcategories array.
 * 5. Verify the parent category now includes the new subcategory in its subcategories array.
 * 6. Verify attempting to create a nested subcategory (subcategory under subcategory) fails with 400 Bad Request.
 */
export async function test_api_category_creation_subcategory(
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
    },
  });
  // 2. Create a top-level parent category
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_category_id: null,
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the parent category
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_category_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Verify subcategory has empty subcategories array (one-level nesting enforced)
  TestValidator.predicate(
    "subcategory subcategories array is empty (one-level nesting)",
    subcategory.subcategories.length === 0,
  );
  TestValidator.predicate(
    "subcategory is active (deleted_at is null)",
    subcategory.deleted_at === null,
  );
  // 5. Verify parent category now includes the subcategory
  TestValidator.predicate(
    "parent category has one subcategory",
    parentCategory.subcategories.length === 1,
  );
  TestValidator.equals(
    "parent category subcategory matches created subcategory",
    parentCategory.subcategories[0].id,
    subcategory.id,
  );
  // 6. Verify creating nested subcategory fails (subcategory under subcategory)
  await TestValidator.httpError(
    "creating nested subcategory should fail with 400 Bad Request",
    400,
    async () => {
      await generate_random_shopping_mall_administrator_categories_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            parent_category_id: subcategory.id, // This should fail - cannot create nested subcategory
          },
        },
      );
    },
  );
}
