import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_admin_category_creation_validation_of_required_fields(
  connection: api.IConnection,
) {
  // 1. Arrange: register an admin to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable; send null explicitly to satisfy DTO while
    // letting backend derive it if desired.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Helper factory for valid base category payloads
  const createBaseCategoryBody = (
    overrides: Partial<IShoppingMallCategory.ICreate> = {},
  ): IShoppingMallCategory.ICreate => {
    const base: IShoppingMallCategory.ICreate = {
      parent_id: null,
      slug: RandomGenerator.alphaNumeric(12),
      name_en: RandomGenerator.paragraph({ sentences: 2 }),
      description_en: RandomGenerator.paragraph({ sentences: 4 }),
      status: "active",
      sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      is_leaf: true,
    } satisfies IShoppingMallCategory.ICreate;

    return {
      ...base,
      ...overrides,
    } satisfies IShoppingMallCategory.ICreate;
  };

  // 3. Case A: attempt category creation with an empty slug string.
  //    This is business-invalid if backend enforces non-blank slugs.
  const emptySlugBody = {
    ...createBaseCategoryBody(),
    slug: "",
  } satisfies IShoppingMallCategory.ICreate;

  await TestValidator.error(
    "category creation should fail when slug is empty string",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: emptySlugBody,
      });
    },
  );

  // 4. Case B: create a first valid category, then attempt duplicate slug
  //    under the same parent_id and expect the second call to fail because of
  //    unique constraint on (parent_id, slug).
  const firstCategoryBody = createBaseCategoryBody();

  const firstCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: firstCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(firstCategory);

  // Duplicate slug under the same parent (null) should be rejected.
  const duplicateSlugBody: IShoppingMallCategory.ICreate = {
    parent_id: firstCategory.parent_id ?? null,
    slug: firstCategory.slug,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  await TestValidator.error(
    "category creation should fail when slug is duplicated within same parent_id",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: duplicateSlugBody,
      });
    },
  );

  // 5. Case C: attempt category creation with a clearly non-standard status
  //    value, assuming service validates against a finite set of business
  //    states (e.g., active/hidden/deprecated). We still send a string to
  //    respect the DTO type while expecting business-rule rejection.
  const invalidStatusBody = createBaseCategoryBody({
    status: "__INVALID_STATUS__",
  });

  await TestValidator.error(
    "category creation should fail when status is not an allowed business value",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: invalidStatusBody,
      });
    },
  );

  // 6. Finally, create a fully valid category to prove constraints are not
  //    overly strict and success is possible when requirements are satisfied.
  const validCategoryBody = createBaseCategoryBody({
    // Reuse a fresh slug to avoid collision with previous cases.
    slug: RandomGenerator.alphaNumeric(16),
    status: "active",
    parent_id: firstCategory.id,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  });

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: validCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // Basic business sanity checks on the successful creation.
  TestValidator.equals(
    "created category slug must match request body slug",
    createdCategory.slug,
    validCategoryBody.slug,
  );
  TestValidator.equals(
    "created category parent_id must match request body parent_id",
    createdCategory.parent_id ?? null,
    validCategoryBody.parent_id ?? null,
  );
  TestValidator.equals(
    "created category status must match request body status",
    createdCategory.status,
    validCategoryBody.status,
  );
  TestValidator.equals(
    "created category sort_order must match request body sort_order",
    createdCategory.sort_order,
    validCategoryBody.sort_order,
  );
  TestValidator.equals(
    "created category is_leaf must match request body is_leaf",
    createdCategory.is_leaf,
    validCategoryBody.is_leaf,
  );
}
