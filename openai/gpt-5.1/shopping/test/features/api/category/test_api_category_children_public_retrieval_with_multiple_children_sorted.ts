import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate public retrieval of a child category summary for a given parent,
 * ensuring it is an immediate child, has correct parent_id, and that the
 * endpoint is accessible without authentication.
 *
 * Business workflow:
 *
 * 1. Register an admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate. This call will set the Authorization
 *    header on the shared connection.
 * 2. As the authenticated admin, create a root parent category via POST
 *    /shoppingMall/admin/categories using IShoppingMallCategory.ICreate with
 *    parent_id set to null and is_leaf set to false.
 * 3. Still as admin, create multiple child categories for that parent, each with
 *    parent_id = parent.id, unique slug values, and distinct sort_order
 *    values.
 * 4. Create one grandchild category by using one of the child category ids as
 *    parent_id, to confirm that deeper descendants are not considered an
 *    immediate child of the parent.
 * 5. Build a new unauthenticated connection that reuses host/options but has an
 *    empty headers object. This represents a public caller without tokens.
 * 6. Call GET /shoppingMall/categories/{categoryId}/children via
 *    api.functional.shoppingMall.categories.children.index using the public
 *    connection and the parent category id as categoryId.
 * 7. Assert that the response is an IShoppingMallCategory.ISummary representing an
 *    immediate child category whose parent_id equals the parent category id.
 *    Also assert that the returned id belongs to one of the previously created
 *    child categories and not to the grandchild.
 * 8. For the returned summary, verify key fields: id, slug, name_en, status,
 *    sort_order, is_leaf, and parent_id.
 * 9. Use typia.assert on all non-void API responses to guarantee schema
 *    conformity, and use TestValidator for business-logic assertions.
 */
export async function test_api_category_children_public_retrieval_with_multiple_children_sorted(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 2. Create root parent category (parent_id = null, is_leaf = false)
  const parentCategoryBody = {
    parent_id: null,
    slug: `parent-${RandomGenerator.alphabets(6)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: parentCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(parentCategory);

  // 3. Create multiple child categories under the parent
  const childBodies: IShoppingMallCategory.ICreate[] = [
    {
      parent_id: parentCategory.id,
      slug: `child-a-${RandomGenerator.alphabets(4)}`,
      name_en: "Child A",
      description_en: RandomGenerator.paragraph({ sentences: 2 }),
      status: "active",
      sort_order: 20 as number & tags.Type<"int32">,
      is_leaf: true,
    },
    {
      parent_id: parentCategory.id,
      slug: `child-b-${RandomGenerator.alphabets(4)}`,
      name_en: "Child B",
      description_en: RandomGenerator.paragraph({ sentences: 2 }),
      status: "active",
      sort_order: 10 as number & tags.Type<"int32">,
      is_leaf: true,
    },
    {
      parent_id: parentCategory.id,
      slug: `child-c-${RandomGenerator.alphabets(4)}`,
      name_en: "Child C",
      description_en: RandomGenerator.paragraph({ sentences: 2 }),
      status: "active",
      sort_order: 30 as number & tags.Type<"int32">,
      is_leaf: true,
    },
  ];

  const childCategories: IShoppingMallCategory[] = [];
  for (const body of childBodies) {
    const created = await api.functional.shoppingMall.admin.categories.create(
      connection,
      { body },
    );
    typia.assert<IShoppingMallCategory>(created);
    childCategories.push(created);
  }

  // 4. Create a grandchild under the first child to validate it is not
  // considered an immediate child of the parent in the children listing.
  const grandchildBody = {
    parent_id: childCategories[0].id,
    slug: `grandchild-${RandomGenerator.alphabets(4)}`,
    name_en: "Grandchild",
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: 5 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const grandchildCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: grandchildBody,
    });
  typia.assert<IShoppingMallCategory>(grandchildCategory);

  // 5. Prepare an unauthenticated public connection (no headers)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Call children listing endpoint as public user
  const childSummary: IShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(
      publicConnection,
      { categoryId: parentCategory.id },
    );
  typia.assert<IShoppingMallCategory.ISummary>(childSummary);

  // 7. Assert that the returned summary is an immediate child of the parent,
  // belongs to one of the created child categories, and is not the grandchild.
  const childIds = childCategories.map((c) => c.id);

  TestValidator.equals(
    "child summary parent_id should equal parent category id",
    childSummary.parent_id,
    parentCategory.id,
  );

  TestValidator.predicate(
    "returned child id should be one of created child categories",
    () => childIds.includes(childSummary.id),
  );

  TestValidator.predicate(
    "returned child id must not be the grandchild id",
    () => childSummary.id !== grandchildCategory.id,
  );

  // 8. Validate key fields on the returned summary
  TestValidator.predicate(
    "child summary slug must be non-empty",
    !!childSummary.slug && childSummary.slug.length > 0,
  );

  TestValidator.predicate(
    "child summary name_en must be non-empty",
    !!childSummary.name_en && childSummary.name_en.length > 0,
  );

  TestValidator.predicate(
    "child summary status must be non-empty",
    !!childSummary.status && childSummary.status.length > 0,
  );

  TestValidator.predicate(
    "child summary sort_order should be an integer number",
    Number.isInteger(childSummary.sort_order),
  );
}
