import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test creating a new top-level category as an administrator.
 *
 * 1. Authenticate as admin by calling the join endpoint
 * 2. Create a category with required fields: name and optional description
 * 3. Verify that the category is created successfully with:
 *    - UUID id
 *    - Proper timestamps (created_at, updated_at)
 *    - Null deleted_at indicating active status
 *    - Null parent reference (since it's top-level)
 *    - Empty subcategories array
 */
export async function test_api_category_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create top-level category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "Electronic devices and gadgets",
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  // 3. Validate response structure
  typia.assert(category);
  // 4. Validate business logic
  TestValidator.equals("category name matches", category.name, "Electronics");
  TestValidator.equals(
    "category description matches",
    category.description,
    "Electronic devices and gadgets",
  );
  TestValidator.predicate(
    "id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(category.id),
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    typia.is<string & tags.Format<"date-time">>(category.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    typia.is<string & tags.Format<"date-time">>(category.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    category.deleted_at,
    null,
  );
  TestValidator.equals("parent is null (top-level)", category.parent, null);
  TestValidator.equals(
    "subcategories is empty array",
    category.subcategories,
    [],
  );
}
