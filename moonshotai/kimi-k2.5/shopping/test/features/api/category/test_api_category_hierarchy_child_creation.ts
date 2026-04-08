import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test creating a subcategory (child category) under an existing parent category.
 * Steps:
 * 1. Authenticate as admin using authorize_admin_join
 * 2. Create a parent category (top-level, no parentId) using utility function
 * 3. Create a child category specifying the parent category ID in parentId field
 * 4. Verify the child category correctly references the parent and hierarchical relationship is intact
 */
export async function test_api_category_hierarchy_child_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Create a parent category (top-level, no parentId)
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string | null>() ?? null,
          parentId: null,
        },
      },
    );
  typia.assert(parentCategory);
  // Step 3: Create a child category with parentId set to parent's ID
  const childCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string | null>() ?? null,
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(childCategory);
  // Step 4: Validate hierarchical relationship
  TestValidator.equals(
    "child parentId matches parent id",
    childCategory.parentId,
    parentCategory.id,
  );
  TestValidator.predicate(
    "child has parent reference",
    childCategory.parent !== null,
  );
  if (childCategory.parent !== null) {
    TestValidator.equals(
      "parent reference has correct id",
      childCategory.parent.id,
      parentCategory.id,
    );
    TestValidator.equals(
      "parent reference has correct name",
      childCategory.parent.name,
      parentCategory.name,
    );
  }
  // Validate parent is top-level (has no parent)
  TestValidator.equals("parent has no parentId", parentCategory.parentId, null);
  TestValidator.equals(
    "parent has no parent reference",
    parentCategory.parent,
    null,
  );
}
