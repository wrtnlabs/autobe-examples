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
 * Test the primary success path for creating a top-level category in the shopping mall platform.
 *
 * This test verifies that an authenticated administrator can successfully create a new
 * top-level category by providing a required name and optional description. The test
 * validates the response structure and ensures proper category creation workflow.
 */
export async function test_api_category_create_top_level_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create top-level category with name and description
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: categoryName,
        description: categoryDescription,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Validate response structure
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryDescription,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
  TestValidator.equals(
    "parent is null for top-level category",
    category.parent,
    null,
  );
  TestValidator.equals(
    "subcategories is empty array",
    category.subcategories,
    [],
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      category.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      category.updated_at,
    ),
  );
}
