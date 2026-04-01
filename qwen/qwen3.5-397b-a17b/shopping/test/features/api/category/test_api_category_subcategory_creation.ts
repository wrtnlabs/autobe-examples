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
 * Test creating a subcategory under an existing parent category.
 *
 * This test validates the hierarchical category structure by:
 * 1. Registering an administrator account for authentication
 * 2. Creating a parent top-level category (no parent_id)
 * 3. Creating a subcategory with parent_id referencing the parent category
 * 4. Verifying the subcategory response contains correct parent reference
 * 5. Validating the parent-child relationship is properly established
 */
export async function test_api_category_subcategory_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create parent top-level category (no parent_id)
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
    "parent is top-level",
    parentCategory.parent === null,
  );
  // 3. Create subcategory with parent_id set to parent category's UUID
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
  // 4. Verify subcategory has correct parent reference
  TestValidator.predicate(
    "subcategory has parent",
    subcategory.parent !== null,
  );
  TestValidator.equals(
    "parent ID matches",
    subcategory.parent!.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    subcategory.parent!.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent description matches",
    subcategory.parent!.description,
    parentCategory.description,
  );
  // 5. Validate parent category remains top-level (unchanged)
  TestValidator.predicate(
    "parent remains top-level",
    parentCategory.parent === null,
  );
}
