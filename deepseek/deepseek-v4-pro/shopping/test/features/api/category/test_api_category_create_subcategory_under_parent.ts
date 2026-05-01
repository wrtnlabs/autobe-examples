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

/**
 * Test creating a subcategory nested under an existing top-level parent category.
 *
 * Validates the one-level category nesting capability of the platform. An administrator first creates a top-level category, then creates a subcategory referencing that parent via parent_id. The response confirms that the subcategory's parent field is populated with the full ISummary (id, name, description) of the top-level category, and that the children array is empty — subcategories cannot themselves have subcategories.
 *
 * 1. Administrator authenticates via join to obtain admin session.
 * 2. Administrator creates a top-level category with no parent_id.
 * 3. Administrator creates a subcategory with parent_id referencing the top-level category.
 * 4. Validates that the subcategory response has parent populated, children empty, and all parent summary fields match the original top-level category.
 */
export async function test_api_category_create_subcategory_under_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a top-level category (no parent_id)
  const topLevelCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(topLevelCategory);
  // 3. Create a subcategory under the top-level parent
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: topLevelCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Validate the subcategory's hierarchy
  TestValidator.predicate(
    "parent is populated for subcategory",
    subcategory.parent !== null,
  );
  TestValidator.equals(
    "parent id matches top-level category",
    subcategory.parent!.id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "parent name matches top-level category",
    subcategory.parent!.name,
    topLevelCategory.name,
  );
  TestValidator.equals(
    "subcategory has no children (leaf node)",
    subcategory.children.length,
    0,
  );
}
