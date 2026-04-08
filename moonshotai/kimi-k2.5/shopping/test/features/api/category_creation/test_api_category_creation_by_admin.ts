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
 * Test administrator category creation workflow.
 *
 * 1. Administrator authentication
 * 2. Create top-level category
 * 3. Verify category data persistence
 * 4. Create subcategory
 * 5. Verify hierarchical relationship
 */
export async function test_api_category_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection (isolation pattern)
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Create a top-level category
  const categoryInput = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommerceMallCategory.ICreate;
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: categoryInput,
    },
  );
  typia.assert(category);
  // Verify data persistence (business logic, not type checking)
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryInput.name,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryInput.description,
  );
  // Create a subcategory to verify hierarchy support
  const subcategoryInput = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parentId: category.id,
  } satisfies IEcommerceMallCategory.ICreate;
  const subcategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: subcategoryInput,
      },
    );
  typia.assert(subcategory);
  // Verify parent-child relationship
  TestValidator.equals(
    "subcategory parent reference correct",
    subcategory.parentId,
    category.id,
  );
}
