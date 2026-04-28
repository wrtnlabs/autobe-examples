import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";

/**
 * Test retrieving a root category with populated child subcategories.
 *
 * Validates the complete category hierarchy retrieval flow for a root category
 * that contains multiple directly nested subcategories. Ensures the response
 * correctly reflects the hierarchical relationship with null parent reference
 * and an array of child category summaries.
 *
 * 1. Admin authenticates to the platform.
 * 2. Admin creates a root category with no parent.
 * 3. Admin creates three child subcategories under the root category.
 * 4. Root category is retrieved via public endpoint.
 * 5. Validates that parentCategory is null, childrenCategories contains all
 *    created subcategories, and root category details match input data.
 */
export async function test_api_category_retrieval_root_with_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create root category (no parent)
  const rootName = RandomGenerator.paragraph({ sentences: 2 });
  const rootDescription = RandomGenerator.paragraph({ sentences: 3 });
  const root = await api.functional.ecommercePlatform.admin.categories.create(
    adminConnection,
    {
      body: {
        name: rootName,
        description: rootDescription,
      } satisfies IEcommercePlatformCategory.ICreate,
    },
  );
  typia.assert(root);
  // 3. Create multiple child subcategories under the root
  const children = await ArrayUtil.asyncRepeat(3, async (i) => {
    const child =
      await api.functional.ecommercePlatform.admin.categories.create(
        adminConnection,
        {
          body: {
            name: `${RandomGenerator.paragraph({ sentences: 2 })} - ${i}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            parentEcommercePlatformCategoryId: root.id,
          } satisfies IEcommercePlatformCategory.ICreate,
        },
      );
    return child;
  });
  children.forEach((c) => typia.assert(c));
  // 4. Retrieve the root category via public endpoint
  const retrieved = await api.functional.ecommercePlatform.categories.at(
    adminConnection,
    {
      categoryId: root.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate root category fields
  TestValidator.equals("id matches", retrieved.id, root.id);
  TestValidator.equals("name matches", retrieved.name, rootName);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    rootDescription,
  );
  TestValidator.equals(
    "parentCategory is null for root",
    retrieved.parentCategory,
    null,
  );
  TestValidator.predicate("deleted_at is null", retrieved.deleted_at === null);
  TestValidator.predicate(
    "created_at exists",
    retrieved.created_at !== "" && retrieved.created_at != null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrieved.updated_at !== "" && retrieved.updated_at != null,
  );
  // 6. Validate childrenCategories hierarchy
  TestValidator.equals(
    "childrenCategories count",
    retrieved.childrenCategories.length,
    children.length,
  );
  const childIds = new Set(children.map((c) => c.id));
  retrieved.childrenCategories.forEach((childSummary) => {
    typia.assert(childSummary);
    TestValidator.predicate(
      `child ${childSummary.id} exists in created children`,
      childIds.has(childSummary.id),
    );
    TestValidator.predicate(
      `child has parent reference`,
      childSummary.parent !== null,
    );
    if (childSummary.parent !== null) {
      TestValidator.equals(
        `child's parent id matches root`,
        childSummary.parent.id,
        root.id,
      );
    }
  });
}
