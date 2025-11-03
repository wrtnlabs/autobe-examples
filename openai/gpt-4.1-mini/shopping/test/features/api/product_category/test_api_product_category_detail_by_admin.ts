import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_category_detail_by_admin(
  connection: api.IConnection,
) {
  // Authenticate as admin before access
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Access a valid product category detail (presumed existing UUID)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const category: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.at(connection, {
      id: categoryId,
    });
  typia.assert(category);

  // Validate required fields for the retrieved category
  TestValidator.predicate(
    "category id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
  TestValidator.predicate(
    "category name is string",
    typeof category.name === "string",
  );
  TestValidator.predicate(
    "category created_at ISO date",
    typeof category.created_at === "string",
  );
  TestValidator.predicate(
    "category updated_at ISO date",
    typeof category.updated_at === "string",
  );

  // Validate deleted_at property explicit null or string (ISO datetime)
  if (category.deleted_at === null) {
    TestValidator.equals("deleted_at is null", category.deleted_at, null);
  } else if (category.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO datetime",
      typeof category.deleted_at === "string",
    );
  }

  // Validate optional nullable parent_id field
  if (category.parent_id === null) {
    TestValidator.equals("parent_id null explicit", category.parent_id, null);
  } else if (category.parent_id !== undefined) {
    TestValidator.predicate(
      "parent_id is UUID string",
      typeof category.parent_id === "string",
    );
  }

  // Test error handling with invalid category id
  await TestValidator.error(
    "invalid category id should cause error",
    async () => {
      await api.functional.shoppingMall.admin.productCategories.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(), // presumably non-existent
      });
    },
  );
}
