import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryHierarchy";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_category_hierarchy_delete_by_admin(
  connection: api.IConnection,
) {
  // 1-1. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        ip: null,
        href: "https://example.com/",
        referrer: "https://google.com/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 1-2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/",
      referrer: "https://google.com/",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 2. Create parent category
  const categoryName: string = RandomGenerator.alphabets(10);
  const category: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
        } satisfies IShoppingMallShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create category hierarchy link (link child to the created category)
  // For child_category_id, create another category as a child first
  const childCategoryName: string = RandomGenerator.alphabets(10);
  const childCategory: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      {
        body: {
          name: childCategoryName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IShoppingMallShoppingMallCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  const hierarchy: IShoppingMallCategoryHierarchy =
    await api.functional.shoppingMall.customer.shoppingMallCategories.shoppingMallCategoryHierarchies.create(
      connection,
      {
        categoryName,
        body: {
          child_category_id: typia.assert<string & tags.Format<"uuid">>(
            childCategory.id,
          ),
        } satisfies IShoppingMallCategoryHierarchy.ICreate,
      },
    );
  typia.assert(hierarchy);

  // 4. Admin deletes the created category hierarchy link
  await api.functional.shoppingMall.admin.shoppingMallCategories.shoppingMallCategoryHierarchies.erase(
    connection,
    {
      categoryName,
      shoppingMallCategoryHierarchyId: typia.assert<
        string & tags.Format<"uuid">
      >(hierarchy.id),
    },
  );
}
