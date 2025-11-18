import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_admin_category_update_partial_fields_only(
  connection: api.IConnection,
) {
  // 1. Join as admin so that admin-category APIs are authorized
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline category with all core fields populated
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 10 satisfies number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const initialCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert(initialCategory);

  // snapshot important baseline fields for later comparison
  const baseSlug = initialCategory.slug;
  const baseNameEn = initialCategory.name_en;
  const baseDescriptionEn = initialCategory.description_en ?? null;
  const baseStatus = initialCategory.status;
  const baseSortOrder = initialCategory.sort_order;
  const baseIsLeaf = initialCategory.is_leaf;
  const baseParentId = initialCategory.parent_id ?? null;
  const baseCreatedAt = initialCategory.created_at;
  const baseDeletedAt = initialCategory.deleted_at ?? null;

  // 3. First partial update: modify description_en and sort_order only
  const newDescriptionEn = RandomGenerator.paragraph({ sentences: 3 });
  const newSortOrder = 20 satisfies number & tags.Type<"int32">;

  const firstUpdateBody = {
    description_en: newDescriptionEn,
    sort_order: newSortOrder,
  } satisfies IShoppingMallCategory.IUpdate;

  const afterFirstUpdate: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: initialCategory.id,
      body: firstUpdateBody,
    });
  typia.assert(afterFirstUpdate);

  // unchanged identity and lifecycle fields
  TestValidator.equals(
    "id must remain stable after first partial category update",
    afterFirstUpdate.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "created_at must remain stable after first partial category update",
    afterFirstUpdate.created_at,
    baseCreatedAt,
  );
  TestValidator.equals(
    "deleted_at must remain stable after first partial category update",
    afterFirstUpdate.deleted_at ?? null,
    baseDeletedAt,
  );

  // updated fields must reflect new values
  TestValidator.equals(
    "description_en must be updated by first partial update",
    afterFirstUpdate.description_en ?? null,
    newDescriptionEn,
  );
  TestValidator.equals(
    "sort_order must be updated by first partial update",
    afterFirstUpdate.sort_order,
    newSortOrder,
  );

  // untouched fields must remain identical to baseline
  TestValidator.equals(
    "slug must remain unchanged after first partial update",
    afterFirstUpdate.slug,
    baseSlug,
  );
  TestValidator.equals(
    "name_en must remain unchanged after first partial update",
    afterFirstUpdate.name_en,
    baseNameEn,
  );
  TestValidator.equals(
    "status must remain unchanged after first partial update",
    afterFirstUpdate.status,
    baseStatus,
  );
  TestValidator.equals(
    "is_leaf must remain unchanged after first partial update",
    afterFirstUpdate.is_leaf,
    baseIsLeaf,
  );
  TestValidator.equals(
    "parent_id must remain unchanged after first partial update",
    afterFirstUpdate.parent_id ?? null,
    baseParentId,
  );

  // updated_at should change compared to initial category
  TestValidator.notEquals(
    "updated_at should change after first partial category update",
    afterFirstUpdate.updated_at,
    initialCategory.updated_at,
  );

  // 4. Second partial update: modify only status (and toggle is_leaf) and ensure
  // that previous and untouched fields are preserved
  const secondStatus = baseStatus === "active" ? "hidden" : baseStatus;
  const secondIsLeaf = !baseIsLeaf;

  const secondUpdateBody = {
    status: secondStatus,
    is_leaf: secondIsLeaf,
  } satisfies IShoppingMallCategory.IUpdate;

  const afterSecondUpdate: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: initialCategory.id,
      body: secondUpdateBody,
    });
  typia.assert(afterSecondUpdate);

  // identity and timestamps
  TestValidator.equals(
    "id must remain stable after second partial category update",
    afterSecondUpdate.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "created_at must remain stable after second partial category update",
    afterSecondUpdate.created_at,
    baseCreatedAt,
  );
  TestValidator.equals(
    "deleted_at must remain stable after second partial category update",
    afterSecondUpdate.deleted_at ?? null,
    baseDeletedAt,
  );

  // fields changed in second update must match new values
  TestValidator.equals(
    "status must be updated by second partial update",
    afterSecondUpdate.status,
    secondStatus,
  );
  TestValidator.equals(
    "is_leaf must be updated by second partial update",
    afterSecondUpdate.is_leaf,
    secondIsLeaf,
  );

  // fields updated in first update but omitted in second must be preserved
  TestValidator.equals(
    "description_en from first update must be preserved after second update",
    afterSecondUpdate.description_en ?? null,
    newDescriptionEn,
  );
  TestValidator.equals(
    "sort_order from first update must be preserved after second update",
    afterSecondUpdate.sort_order,
    newSortOrder,
  );

  // fields that have never been updated in either body must still equal baseline
  TestValidator.equals(
    "slug must remain unchanged after second partial update",
    afterSecondUpdate.slug,
    baseSlug,
  );
  TestValidator.equals(
    "name_en must remain unchanged after second partial update",
    afterSecondUpdate.name_en,
    baseNameEn,
  );
  TestValidator.equals(
    "parent_id must remain unchanged after second partial update",
    afterSecondUpdate.parent_id ?? null,
    baseParentId,
  );

  // updated_at should move forward again on second update
  TestValidator.notEquals(
    "updated_at should change again after second partial category update",
    afterSecondUpdate.updated_at,
    afterFirstUpdate.updated_at,
  );
}
