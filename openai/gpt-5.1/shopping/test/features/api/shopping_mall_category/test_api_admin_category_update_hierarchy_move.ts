import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Verify that an administrator can move a category within the taxonomy tree by
 * updating its parent_id from one root category to another.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) to obtain an authenticated context.
 * 2. Create root category A (parent_id = null).
 * 3. Create root category B (parent_id = null).
 * 4. Create child category C under A (parent_id = A.id).
 * 5. Update C via PUT /shoppingMall/admin/categories/{categoryId}, changing
 *    parent_id to B.id and adjusting sort_order.
 * 6. Assert that the response shows parent_id = B.id and that other properties are
 *    consistent with expectations.
 */
export async function test_api_admin_category_update_hierarchy_move(
  connection: api.IConnection,
) {
  // 1. Admin join to get authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create root category A (parent_id = null)
  const categoryARootInput = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryARootInput,
    });
  typia.assert(categoryA);

  // 3. Create root category B (parent_id = null)
  const categoryBRootInput = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBRootInput,
    });
  typia.assert(categoryB);

  // 4. Create child category C under parent A
  const categoryCChildInput = {
    parent_id: categoryA.id,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryCOriginal: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCChildInput,
    });
  typia.assert(categoryCOriginal);

  TestValidator.equals(
    "child C initially has parent A",
    categoryCOriginal.parent_id,
    categoryA.id,
  );

  // 5. Move C from parent A to parent B, updating sort_order
  const updatedSortOrder: number & tags.Type<"int32"> = 3 as number &
    tags.Type<"int32">;

  const updateBody = {
    parent_id: categoryB.id,
    sort_order: updatedSortOrder,
  } satisfies IShoppingMallCategory.IUpdate;

  const categoryCUpdated: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: categoryCOriginal.id,
      body: updateBody,
    });
  typia.assert(categoryCUpdated);

  // 6. Assertions on updated category
  TestValidator.equals(
    "category C parent_id moved from A to B",
    categoryCUpdated.parent_id,
    categoryB.id,
  );

  TestValidator.equals(
    "category C sort_order updated",
    categoryCUpdated.sort_order,
    updatedSortOrder,
  );

  TestValidator.equals(
    "category C slug remains unchanged",
    categoryCUpdated.slug,
    categoryCOriginal.slug,
  );

  TestValidator.equals(
    "category C name_en remains unchanged",
    categoryCUpdated.name_en,
    categoryCOriginal.name_en,
  );

  TestValidator.equals(
    "category C description_en remains unchanged",
    categoryCUpdated.description_en ?? null,
    categoryCOriginal.description_en ?? null,
  );

  TestValidator.equals(
    "category C status remains unchanged",
    categoryCUpdated.status,
    categoryCOriginal.status,
  );

  TestValidator.equals(
    "category C is_leaf remains unchanged",
    categoryCUpdated.is_leaf,
    categoryCOriginal.is_leaf,
  );
}
