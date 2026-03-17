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
 * Test retrieving a subcategory and verifying the hierarchical parent-child
 * relationship is correctly returned. This validates the one-level nesting
 * support for categories works correctly.
 *
 * 1. Admin authenticates and creates a parent category
 * 2. Admin creates a subcategory with parentId referencing the parent
 * 3. Retrieve the subcategory via the public category endpoint
 * 4. Verify the response includes the parent field populated with
 *    IEcommerceMallCategory.ISummary containing the parent's id, name,
 *    description, and createdAt
 */
export async function test_api_category_retrieve_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory with parent reference
  const subcategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve the subcategory via public endpoint
  const retrievedCategory = await api.functional.ecommerceMall.categories.at(
    adminConnection,
    { categoryId: subcategory.id },
  );
  typia.assert(retrievedCategory);
  // 5. Verify the parent-child relationship is correctly returned
  TestValidator.predicate(
    "parent field exists",
    retrievedCategory.parent !== null,
  );
  typia.assertGuard<IEcommerceMallCategory.ISummary>(retrievedCategory.parent!);
  TestValidator.equals(
    "parent id matches",
    retrievedCategory.parent.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    retrievedCategory.parent.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent description matches",
    retrievedCategory.parent.description,
    parentCategory.description,
  );
}
