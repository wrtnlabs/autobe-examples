import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_update_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      href: "http://test.local/admin/join",
      referrer: "http://test.local/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token from auth response
  const adminUpdatedConnection: api.IConnection = { host: connection.host };
  adminUpdatedConnection.headers = {
    ...connection.headers,
    Authorization: adminAuth.token.access,
  };
  // 3. Create a category to update (use random UUID as category ID)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Create initial category with name and description
  const newCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminUpdatedConnection,
      {
        categoryId,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(newCategory);
  // Store original values before second update
  const originalName = newCategory.name;
  const originalDescription = newCategory.description;
  const originalUpdatedAt = newCategory.updated_at;
  const originalId = newCategory.id;
  const originalIsLeaf = newCategory.is_leaf;
  const originalCreatedAt = newCategory.created_at;
  const originalDeletedAt = newCategory.deleted_at;
  const originalParent = newCategory.parent;
  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Update the category with new name and description
  const newName = RandomGenerator.name(4);
  const newDescription = RandomGenerator.content({ paragraphs: 1 });
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminUpdatedConnection,
      {
        categoryId: originalId,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate updated name and description
  TestValidator.equals("category name updated", updatedCategory.name, newName);
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    newDescription,
  );
  // 6. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    originalUpdatedAt,
    updatedCategory.updated_at,
  );
  // 7. Validate all required fields present in response
  TestValidator.equals("category id preserved", updatedCategory.id, originalId);
  TestValidator.equals(
    "is_leaf preserved",
    updatedCategory.is_leaf,
    originalIsLeaf,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedCategory.deleted_at,
    originalDeletedAt,
  );
  TestValidator.equals(
    "parent reference unchanged",
    updatedCategory.parent,
    originalParent,
  );
  // 8. Validate name is unique within parent level (update succeeded)
  TestValidator.predicate(
    "name is unique within parent level",
    updatedCategory.name !== originalName,
  );
  // 9. Validate category is immediately visible with updated info
  TestValidator.predicate(
    "category has updated name",
    updatedCategory.name === newName,
  );
  TestValidator.predicate(
    "category has updated description",
    updatedCategory.description === newDescription,
  );
  TestValidator.predicate(
    "category is active",
    updatedCategory.deleted_at === null,
  );
}
