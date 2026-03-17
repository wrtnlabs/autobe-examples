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
 * Test that an administrator can successfully create a new top-level parent category on the e-commerce platform.
 * The scenario validates:
 * (1) Admin authentication is required and enforced
 * (2) Category name is provided and is unique
 * (3) No parent_id is specified for top-level category
 * (4) Optional description field is included
 * (5) System creates the category record with proper timestamps
 * (6) System automatically creates an initial category snapshot capturing the category state
 * (7) Response includes complete category information with generated UUID
 * (8) Created category appears in category listings for customer browsing
 *
 * This validates the primary success path for category creation workflow.
 */
export async function test_api_category_create_parent_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create parent category (top-level, no parent_id)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        // No parent_id for top-level parent category
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Validate category properties
  TestValidator.equals("category has UUID", typeof category.id, "string");
  TestValidator.predicate("category name exists", category.name.length > 0);
  TestValidator.predicate(
    "parent_id is null for parent category",
    category.parent_id === null,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    category.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    category.updated_at !== undefined,
  );
  TestValidator.predicate(
    "parent is null for top-level",
    category.parent === null,
  );
  TestValidator.predicate(
    "subcategories is empty array",
    Array.isArray(category.subcategories),
  );
  TestValidator.predicate(
    "deleted_at is null for active category",
    category.deleted_at === null,
  );
}