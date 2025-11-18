import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_public_category_retrieval_hierarchy_fields(
  connection: api.IConnection,
) {
  /**
   * Validate that the public category retrieval endpoint correctly exposes
   * hierarchy-related fields and core operational attributes.
   *
   * Steps:
   *
   * 1. Join an admin account (POST /auth/admin/join) to gain admin context.
   * 2. Create a root category via POST /shoppingMall/admin/categories.
   * 3. Create a child category whose parent_id points to the root category.
   * 4. Build an unauthenticated connection (no headers) to simulate a public
   *    client.
   * 5. Retrieve the child category via GET /shoppingMall/categories/{categoryId}.
   * 6. Assert that parent_id, is_leaf, status, and sort_order match creation.
   * 7. Retrieve the root category and verify parent_id is null and other fields
   *    match.
   */

  // 1. Admin joins the system to obtain an authorized admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a root category using the admin context.
  const rootCreateBody = {
    parent_id: null,
    slug: RandomGenerator.name(1),
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: rootCreateBody,
    });
  typia.assert(rootCategory);

  // 3. Create a child category whose parent is the root.
  const childCreateBody = {
    parent_id: rootCategory.id,
    slug: RandomGenerator.name(1),
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: childCreateBody,
    });
  typia.assert(childCategory);

  // 4. Prepare an unauthenticated connection to simulate a public requester.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Retrieve the child category through the public endpoint.
  const publicChild: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.at(publicConnection, {
      categoryId: childCategory.id,
    });
  typia.assert(publicChild);

  // 6. Validate hierarchy and core fields for the child category.
  TestValidator.equals(
    "child.parent_id should match root.id",
    publicChild.parent_id ?? null,
    rootCategory.id,
  );
  TestValidator.equals(
    "child.is_leaf should reflect creation flag true",
    publicChild.is_leaf,
    childCreateBody.is_leaf,
  );
  TestValidator.equals(
    "child.status should reflect creation status",
    publicChild.status,
    childCreateBody.status,
  );
  TestValidator.equals(
    "child.sort_order should reflect creation sort_order",
    publicChild.sort_order,
    childCreateBody.sort_order,
  );

  // 7. Retrieve the root category publicly and validate its hierarchy fields.
  const publicRoot: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.at(publicConnection, {
      categoryId: rootCategory.id,
    });
  typia.assert(publicRoot);

  TestValidator.equals(
    "root.parent_id should be null for a root category",
    publicRoot.parent_id ?? null,
    null,
  );
  TestValidator.equals(
    "root.is_leaf should reflect creation flag",
    publicRoot.is_leaf,
    rootCreateBody.is_leaf,
  );
  TestValidator.equals(
    "root.status should reflect creation status",
    publicRoot.status,
    rootCreateBody.status,
  );
  TestValidator.equals(
    "root.sort_order should reflect creation sort_order",
    publicRoot.sort_order,
    rootCreateBody.sort_order,
  );
}
