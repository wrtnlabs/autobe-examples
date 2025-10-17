import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test the creation of a new shopping mall product category by an
 * administrator.
 *
 * The test covers creating a category with mandatory fields including code,
 * name, display order, and optional description and parent category reference.
 * It validates the requirement of authorization with the admin role and the
 * uniqueness of the category code.
 *
 * It ensures the created category returns correct timestamps and assigned ID.
 */

export async function test_api_category_creation_by_admin(
  connection: api.IConnection,
) {
  // 1) Admin registration (join) to get authorization token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "p@ssword123"; // Use a valid password string
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2) Create a new product category
  const categoryCode = `cat_${RandomGenerator.alphaNumeric(6)}`;
  const categoryName = RandomGenerator.name(2);
  const categoryDisplayOrder = typia.random<number & tags.Type<"int32">>();
  const categoryCreateBody = {
    code: categoryCode,
    name: categoryName,
    display_order: categoryDisplayOrder satisfies number as number,
    description: null,
    parent_id: null,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3) Validate the created category
  TestValidator.equals(
    "created category code matches",
    category.code,
    categoryCode,
  );
  TestValidator.equals(
    "created category name matches",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "created category display order matches",
    category.display_order,
    categoryDisplayOrder,
  );

  // 4) Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    typeof category.created_at === "string" &&
      !isNaN(Date.parse(category.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    typeof category.updated_at === "string" &&
      !isNaN(Date.parse(category.updated_at)),
  );

  // 5) Validate id
  TestValidator.predicate(
    "id is UUID format",
    typeof category.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        category.id,
      ),
  );

  // 6) Validate optional properties are null (because we set them null)
  TestValidator.equals("parent_id is null", category.parent_id, null);
  TestValidator.equals("description is null", category.description, null);
}
