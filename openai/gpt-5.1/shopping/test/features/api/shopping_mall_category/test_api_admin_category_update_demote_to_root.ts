import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_admin_category_update_demote_to_root(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization context (token auto-injected by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip:
      Math.random() < 0.5
        ? (typia.random<string & tags.Format<"ipv4">>() as string &
            tags.Format<"ipv4">)
        : (typia.random<string & tags.Format<"ipv6">>() as string &
            tags.Format<"ipv6">),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a root parent category P (parent_id = null)
  const rootCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 satisfies number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: rootCreateBody,
    });
  typia.assert(parentCategory);

  TestValidator.equals(
    "parent category must be root (parent_id null)",
    parentCategory.parent_id,
    null,
  );

  // 3. Create a child category C under parent P
  const childCreateBody = {
    parent_id: parentCategory.id,
    slug: RandomGenerator.alphabets(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 2 satisfies number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategoryBefore: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCreateBody,
    });
  typia.assert(childCategoryBefore);

  TestValidator.equals(
    "child category must initially point to parent",
    childCategoryBefore.parent_id,
    parentCategory.id,
  );

  // 4. Update child C to become root (parent_id -> null) and optionally adjust leaf flag
  const updateBody = {
    parent_id: null,
    is_leaf: childCategoryBefore.is_leaf,
    sort_order: childCategoryBefore.sort_order,
    status: childCategoryBefore.status,
    slug: childCategoryBefore.slug,
    name_en: childCategoryBefore.name_en,
    description_en: childCategoryBefore.description_en ?? null,
  } satisfies IShoppingMallCategory.IUpdate;

  const childCategoryAfter: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: childCategoryBefore.id,
      body: updateBody,
    });
  typia.assert(childCategoryAfter);

  // 5. Validate business expectations
  // 5-1. id should remain unchanged
  TestValidator.equals(
    "category id remains unchanged after demotion to root",
    childCategoryAfter.id,
    childCategoryBefore.id,
  );

  // 5-2. parent_id should now be null (root)
  TestValidator.equals(
    "child category parent_id becomes null (now root)",
    childCategoryAfter.parent_id,
    null,
  );

  // 5-3. status should remain the same
  TestValidator.equals(
    "status remains unchanged after parent_id update",
    childCategoryAfter.status,
    childCategoryBefore.status,
  );

  // 5-4. created_at must not change
  TestValidator.equals(
    "created_at must be stable across update",
    childCategoryAfter.created_at,
    childCategoryBefore.created_at,
  );

  // 5-5. updated_at must advance (be different)
  TestValidator.notEquals(
    "updated_at must change after update",
    childCategoryAfter.updated_at,
    childCategoryBefore.updated_at,
  );

  // 5-6. Other core fields stay consistent
  TestValidator.equals(
    "slug remains unchanged after update",
    childCategoryAfter.slug,
    childCategoryBefore.slug,
  );
  TestValidator.equals(
    "name_en remains unchanged after update",
    childCategoryAfter.name_en,
    childCategoryBefore.name_en,
  );
  TestValidator.equals(
    "description_en remains logically equivalent after update",
    childCategoryAfter.description_en ?? null,
    childCategoryBefore.description_en ?? null,
  );
  TestValidator.equals(
    "is_leaf remains unchanged after update",
    childCategoryAfter.is_leaf,
    childCategoryBefore.is_leaf,
  );
  TestValidator.equals(
    "sort_order remains unchanged after update",
    childCategoryAfter.sort_order,
    childCategoryBefore.sort_order,
  );
}
