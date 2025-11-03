import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_category_child_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (authentication) to receive access token.
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "StrongP@ssw0rd!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Simulate existing parent category by generating a random UUID for parentId.
  const parentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a child category under the parentId
  const childCreateBody = {
    parent_id: parentId,
    name: `child_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductCategory.ICreate;

  const childCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.children.createChildCategory(
      connection,
      {
        parentId: parentId,
        body: childCreateBody,
      },
    );
  typia.assert(childCategory);

  TestValidator.equals(
    "child category parent_id matches",
    childCategory.parent_id,
    parentId,
  );
  TestValidator.equals(
    "child category name matches",
    childCategory.name,
    childCreateBody.name,
  );

  // 4. Delete the child category under the parent category
  await api.functional.shoppingMall.admin.productCategories.children.erase(
    connection,
    {
      parentId: parentId,
      childId: childCategory.id,
    },
  );

  // 5. Try deleting the same child category again, expect error (simulate error)
  await TestValidator.error(
    "deleting non-existent child category should fail",
    async () => {
      await api.functional.shoppingMall.admin.productCategories.children.erase(
        connection,
        {
          parentId: parentId,
          childId: childCategory.id,
        },
      );
    },
  );

  // 6. Try deleting with invalid admin (simulate by creating a new connection without authentication)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.shoppingMall.admin.productCategories.children.erase(
      unauthenticatedConnection,
      {
        parentId: parentId,
        childId: childCategory.id,
      },
    );
  });
}
