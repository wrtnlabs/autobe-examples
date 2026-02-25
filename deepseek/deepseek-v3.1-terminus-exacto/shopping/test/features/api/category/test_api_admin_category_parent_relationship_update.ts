import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_admin_category_parent_relationship_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create parent category (level 1) using utility function
  const parentCategory =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(parentCategory);
  TestValidator.predicate(
    "parent category has no parent",
    parentCategory.parent_category_id === null,
  );
  // 3. Create child category (level 2 - will be updated)
  const childCategory1 =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(childCategory1);
  TestValidator.predicate(
    "child category 1 initially has no parent",
    childCategory1.parent_category_id === null,
  );
  // 4. Create another child category (level 2 - will remain unchanged)
  const childCategory2 =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(childCategory2);
  // 5. Test: Move childCategory1 to be a child of parentCategory
  const updatedAsChild =
    await api.functional.ecommerce.administrator.categories.update(
      adminConnection,
      {
        categoryId: childCategory1.id,
        body: {
          parent_category_id: parentCategory.id,
        } satisfies IEcommerceCategory.IUpdate,
      },
    );
  typia.assert(updatedAsChild);
  TestValidator.equals(
    "category now has parent ID",
    updatedAsChild.parent_category_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent object reference resolved",
    updatedAsChild.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent object name matches",
    updatedAsChild.parent?.name,
    parentCategory.name,
  );
  // 6. Test: Remove parent relationship (set to null to make top-level)
  const updatedAsTopLevel =
    await api.functional.ecommerce.administrator.categories.update(
      adminConnection,
      {
        categoryId: childCategory1.id,
        body: {
          parent_category_id: null,
        } satisfies IEcommerceCategory.IUpdate,
      },
    );
  typia.assert(updatedAsTopLevel);
  TestValidator.predicate(
    "category now has no parent",
    updatedAsTopLevel.parent_category_id === null,
  );
  TestValidator.predicate(
    "parent object is null",
    updatedAsTopLevel.parent === null,
  );
  // 7. Test: Circular reference prevention
  await TestValidator.error(
    "prevent circular reference (self-parent)",
    async () => {
      await api.functional.ecommerce.administrator.categories.update(
        adminConnection,
        {
          categoryId: parentCategory.id,
          body: {
            parent_category_id: parentCategory.id,
          } satisfies IEcommerceCategory.IUpdate,
        },
      );
    },
  );
  // Test circular reference: child cannot be parent of its parent
  await TestValidator.error(
    "prevent circular reference (child-to-parent)",
    async () => {
      await api.functional.ecommerce.administrator.categories.update(
        adminConnection,
        {
          categoryId: parentCategory.id,
          body: {
            parent_category_id: childCategory1.id, // Child trying to be parent of original parent
          } satisfies IEcommerceCategory.IUpdate,
        },
      );
    },
  );
  // 8. Test: Name uniqueness within same hierarchy level
  // First create a child category with the same name as parent but different level
  // Use the utility function instead of direct API call to avoid ICreate interface issues
  const conflictingNameChild =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `${parentCategory.name}-child`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(conflictingNameChild);
  TestValidator.equals(
    "category name set correctly",
    conflictingNameChild.name,
    `${parentCategory.name}-child`,
  );
  // Move this category under parent for hierarchy testing
  const movedConflictingNameChild =
    await api.functional.ecommerce.administrator.categories.update(
      adminConnection,
      {
        categoryId: conflictingNameChild.id,
        body: {
          parent_category_id: parentCategory.id,
        } satisfies IEcommerceCategory.IUpdate,
      },
    );
  typia.assert(movedConflictingNameChild);
  // Test name uniqueness violation at same level
  await TestValidator.error(
    "prevent duplicate name at same hierarchy level",
    async () => {
      await api.functional.ecommerce.administrator.categories.update(
        adminConnection,
        {
          categoryId: childCategory2.id,
          body: {
            name: movedConflictingNameChild.name,
            parent_category_id: parentCategory.id, // Same parent as conflictingNameChild
          } satisfies IEcommerceCategory.IUpdate,
        },
      );
    },
  );
  // 9. Validate hierarchy constraints are maintained
  const childWithParent =
    await api.functional.ecommerce.administrator.categories.update(
      adminConnection,
      {
        categoryId: childCategory2.id,
        body: {
          parent_category_id: parentCategory.id,
        } satisfies IEcommerceCategory.IUpdate,
      },
    );
  typia.assert(childWithParent);
  TestValidator.equals(
    "hierarchy properly maintained",
    childWithParent.parent_category_id,
    parentCategory.id,
  );
}