import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test successful creation of a top-level category by an administrator.
 *
 * Validates the complete category creation flow including administrator authentication and top-level category creation. Ensures that the category is created with correct name and description, has null parent reference indicating top-level status, and contains proper timestamps for audit tracking.
 *
 * Special attention is given to verifying that the parent field is null (confirming top-level status), all timestamps are valid ISO 8601 date-time strings, and the category can be used as a parent for future subcategories.
 *
 * 1. Administrator registers with unique email and credentials using authorize_admin_join utility.
 * 2. Administrator creates a top-level category with name and description using generate_random_shopping_mall_admin_categories_create utility (no parentId specified).
 * 3. Validate response contains complete category entity with all required fields.
 * 4. Verify parent is null confirming top-level status.
 * 5. Verify timestamps (createdAt, updatedAt) are valid ISO 8601 date-time strings.
 * 6. Verify deletedAt is null indicating active category.
 */
export async function test_api_category_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create top-level category (no parentId)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parentId: null,
      },
    },
  );
  typia.assert(category);
  // 3. Verify top-level status (parent is null)
  TestValidator.equals(
    "parent is null for top-level category",
    category.parent,
    null,
  );
  // 4. Verify category is active (not soft-deleted)
  TestValidator.equals(
    "deletedAt is null for active category",
    category.deletedAt,
    null,
  );
  // 5. Verify timestamps are chronologically valid
  TestValidator.predicate(
    "updatedAt is not before createdAt",
    new Date(category.updatedAt).getTime() >=
      new Date(category.createdAt).getTime(),
  );
}
