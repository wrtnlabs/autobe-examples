import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_category_update_partial_fields_leaving_others_unchanged(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const treeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const treeCreateBody = {
    code: treeCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeCreateBody },
    );
  typia.assert(tree);

  TestValidator.equals(
    "created tree code should match request",
    tree.code,
    treeCode,
  );

  // 3. Create an initial parent category
  const parentCategoryCode = `parent-${RandomGenerator.alphaNumeric(6)}`;
  const parentCategoryCreateBody = {
    code: parentCategoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: parentCategoryCreateBody,
      },
    );
  typia.assert(parentCategory);

  TestValidator.equals(
    "parent category treeCode matches tree",
    parentCategory.treeCode,
    tree.code,
  );

  // 3-b. Create a child category under the parent with all explicit fields
  const childCategoryCode = `child-${RandomGenerator.alphaNumeric(6)}`;
  const initialName = RandomGenerator.paragraph({ sentences: 1 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const initialDisplayOrder = 10 as number & tags.Type<"int32">;
  const initialIsActive = true;

  const childCategoryCreateBody = {
    code: childCategoryCode,
    name: initialName,
    description: initialDescription,
    displayOrder: initialDisplayOrder,
    isActive: initialIsActive,
    parentCategoryCode: parentCategory.code,
  } satisfies IShoppingMallCategory.ICreate;

  const originalCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: childCategoryCreateBody,
      },
    );
  typia.assert(originalCategory);

  // 4. First partial update: only name and description
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });

  const firstUpdateBody = {
    name: updatedName,
    description: updatedDescription,
  } satisfies IShoppingMallCategory.IUpdate;

  const firstUpdated: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
      connection,
      {
        categoryTreeCode: tree.code,
        categoryCode: originalCategory.code,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstUpdated);

  // 5. Validate first partial update behavior
  TestValidator.equals(
    "name should be updated after first partial update",
    firstUpdated.name,
    updatedName,
  );

  TestValidator.equals(
    "description should be updated after first partial update",
    firstUpdated.description ?? null,
    updatedDescription,
  );

  TestValidator.equals(
    "displayOrder should remain unchanged after first partial update",
    firstUpdated.displayOrder,
    originalCategory.displayOrder,
  );

  TestValidator.equals(
    "isActive should remain unchanged after first partial update",
    firstUpdated.isActive,
    originalCategory.isActive,
  );

  TestValidator.equals(
    "parentCategoryCode should remain unchanged after first partial update",
    firstUpdated.parentCategoryCode ?? null,
    originalCategory.parentCategoryCode ?? null,
  );

  // Structural fields that must not change
  TestValidator.equals(
    "treeCode should remain unchanged",
    firstUpdated.treeCode,
    originalCategory.treeCode,
  );
  TestValidator.equals(
    "code should remain unchanged",
    firstUpdated.code,
    originalCategory.code,
  );
  TestValidator.equals(
    "id should remain unchanged",
    firstUpdated.id,
    originalCategory.id,
  );
  TestValidator.equals(
    "isLeaf should remain unchanged",
    firstUpdated.isLeaf,
    originalCategory.isLeaf,
  );
  TestValidator.equals(
    "depth should remain unchanged",
    firstUpdated.depth,
    originalCategory.depth,
  );

  TestValidator.equals(
    "createdAt should remain unchanged",
    firstUpdated.createdAt,
    originalCategory.createdAt,
  );

  TestValidator.equals(
    "deletedAt should remain unchanged",
    firstUpdated.deletedAt ?? null,
    originalCategory.deletedAt ?? null,
  );

  TestValidator.notEquals(
    "updatedAt should change after first update",
    firstUpdated.updatedAt,
    originalCategory.updatedAt,
  );

  // 6. Second partial update: only displayOrder
  const secondDisplayOrder = (initialDisplayOrder + 5) as number &
    tags.Type<"int32">;

  const secondUpdateBody = {
    displayOrder: secondDisplayOrder,
  } satisfies IShoppingMallCategory.IUpdate;

  const secondUpdated: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
      connection,
      {
        categoryTreeCode: tree.code,
        categoryCode: originalCategory.code,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdated);

  // 7. Validate second partial update behavior
  TestValidator.equals(
    "name should remain from first update after second partial update",
    secondUpdated.name,
    firstUpdated.name,
  );

  TestValidator.equals(
    "description should remain from first update after second partial update",
    secondUpdated.description ?? null,
    firstUpdated.description ?? null,
  );

  TestValidator.equals(
    "displayOrder should reflect second update",
    secondUpdated.displayOrder,
    secondDisplayOrder,
  );

  TestValidator.equals(
    "isActive should still remain unchanged",
    secondUpdated.isActive,
    originalCategory.isActive,
  );

  TestValidator.equals(
    "parentCategoryCode should still remain unchanged",
    secondUpdated.parentCategoryCode ?? null,
    originalCategory.parentCategoryCode ?? null,
  );

  TestValidator.equals(
    "treeCode should remain unchanged after second update",
    secondUpdated.treeCode,
    originalCategory.treeCode,
  );
  TestValidator.equals(
    "code should remain unchanged after second update",
    secondUpdated.code,
    originalCategory.code,
  );
  TestValidator.equals(
    "id should remain unchanged after second update",
    secondUpdated.id,
    originalCategory.id,
  );
  TestValidator.equals(
    "isLeaf should remain unchanged after second update",
    secondUpdated.isLeaf,
    originalCategory.isLeaf,
  );
  TestValidator.equals(
    "depth should remain unchanged after second update",
    secondUpdated.depth,
    originalCategory.depth,
  );

  TestValidator.equals(
    "createdAt should still remain unchanged",
    secondUpdated.createdAt,
    originalCategory.createdAt,
  );

  TestValidator.equals(
    "deletedAt should still remain unchanged",
    secondUpdated.deletedAt ?? null,
    originalCategory.deletedAt ?? null,
  );

  TestValidator.notEquals(
    "updatedAt should change again after second update",
    secondUpdated.updatedAt,
    firstUpdated.updatedAt,
  );

  // 8. Negative scenario: attempt to set a non-existent parentCategoryCode
  const impossibleParentCode = `non-existent-${RandomGenerator.alphaNumeric(6)}`;
  const invalidUpdateBody = {
    parentCategoryCode: impossibleParentCode,
  } satisfies IShoppingMallCategory.IUpdate;

  await TestValidator.error(
    "updating to non-existent parent should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
        connection,
        {
          categoryTreeCode: tree.code,
          categoryCode: originalCategory.code,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
