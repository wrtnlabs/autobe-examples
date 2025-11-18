import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Happy-path verification for category ancestors endpoint with a simple
 * parent-child chain.
 *
 * Business flow:
 *
 * 1. Admin joins the platform using /auth/admin/join (creates an admin and
 *    authenticates it).
 * 2. Admin creates a root category (no parent_id) using
 *    /shoppingMall/admin/categories.
 * 3. Admin creates a child category whose parent_id points to the root category.
 * 4. A public (unauthenticated) client calls
 *    /shoppingMall/categories/{categoryId}/ancestors for the child category.
 * 5. Verify that the endpoint returns the immediate parent/root as
 *    IShoppingMallCategory.ISummary and that all key fields match the created
 *    root category.
 */
export async function test_api_category_ancestors_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication + admin creation)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create root category (no parent)
  const rootCategoryBody = {
    parent_id: null,
    slug: `root-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.name(2),
    description_en: null,
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: rootCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(rootCategory);

  // 3. Create child category with parent_id = rootCategory.id
  const childCategoryBody = {
    parent_id: rootCategory.id,
    slug: `child-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.name(2),
    description_en: null,
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(childCategory);

  // 4. Build unauthenticated/public connection – do not mutate original connection.headers
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Call ancestors endpoint for child category as public client
  const ancestorSummary: IShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.ancestors.index(
      publicConnection,
      {
        categoryId: childCategory.id,
      },
    );
  typia.assert<IShoppingMallCategory.ISummary>(ancestorSummary);

  // 6. Business assertions: returned summary must represent the root category
  TestValidator.equals(
    "ancestor id should equal root category id",
    ancestorSummary.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "ancestor slug should equal root category slug",
    ancestorSummary.slug,
    rootCategory.slug,
  );
  TestValidator.equals(
    "ancestor name_en should equal root category name_en",
    ancestorSummary.name_en,
    rootCategory.name_en,
  );
  TestValidator.equals(
    "ancestor status should equal root category status",
    ancestorSummary.status,
    rootCategory.status,
  );
  TestValidator.equals(
    "ancestor sort_order should equal root category sort_order",
    ancestorSummary.sort_order,
    rootCategory.sort_order,
  );
  TestValidator.equals(
    "ancestor is_leaf should equal root category is_leaf",
    ancestorSummary.is_leaf,
    rootCategory.is_leaf,
  );
  TestValidator.equals(
    "ancestor parent_id should equal root category parent_id (root is null)",
    ancestorSummary.parent_id ?? null,
    rootCategory.parent_id ?? null,
  );
  TestValidator.equals(
    "ancestor created_at should equal root category created_at",
    ancestorSummary.created_at,
    rootCategory.created_at,
  );
  TestValidator.equals(
    "ancestor updated_at should equal root category updated_at",
    ancestorSummary.updated_at,
    rootCategory.updated_at,
  );
}
