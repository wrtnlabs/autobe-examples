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
 * Test that an authenticated administrator can successfully create a new top-level category.
 *
 * Validates the primary success path for category taxonomy creation. An administrator registers, authenticates, then creates a top-level category without a parent_id. The response is verified to contain a UUID id, the submitted name and description, null parent, empty children array, equal created_at and updated_at timestamps, and null deleted_at.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Administrator creates a top-level category with randomized name and description.
 * 3. Validates response matches input data and top-level category structural expectations.
 */
export async function test_api_category_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create top-level category
  const body = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallCategory.ICreate;
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body },
  );
  typia.assert(category);
  // 3. Validate response
  TestValidator.equals("name matches", category.name, body.name);
  TestValidator.equals(
    "description matches",
    category.description,
    body.description,
  );
  TestValidator.equals("parent is null", category.parent, null);
  TestValidator.equals("children is empty", category.children.length, 0);
  TestValidator.equals(
    "created_at equals updated_at",
    category.created_at,
    category.updated_at,
  );
  TestValidator.equals("deleted_at is null", category.deleted_at, null);
}
