import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate retrieval of a shopping mall category by unique name.
 *
 * This test exercises end-to-end creation and public retrieval of a category in
 * the shopping mall taxonomy. It first registers a new admin and then creates a
 * unique category using the admin management endpoint. It then tests that the
 * publicly accessible "get by name" endpoint returns the full details of the
 * category, including audit fields (created_at, updated_at, deleted_at),
 * status, sorting order, and hierarchy (parent_id). Assertions are made on all
 * key fields for full bidirectional integrity. No authentication is set for the
 * public GET endpoint. Also verifies that all business required fields match
 * and that the endpoint behavior does not require login.
 */
export async function test_api_category_retrieval_by_unique_name(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!@";
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create category (as admin)
  const categoryName = RandomGenerator.alphabets(10);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const sortOrder = typia.random<number & tags.Type<"int32">>();
  const status = RandomGenerator.pick([
    "active",
    "inactive",
    "deprecated",
  ] as const);
  const createInput = {
    name: categoryName,
    description: categoryDescription,
    sort_order: sortOrder,
    status: status,
    parent_id: null,
  } satisfies IShoppingMallCategory.ICreate;

  const created = await api.functional.shoppingMall.admin.mallCategories.create(
    connection,
    {
      body: createInput,
    },
  );
  typia.assert(created);
  TestValidator.equals("created name", created.name, categoryName);
  TestValidator.equals(
    "created description",
    created.description,
    categoryDescription,
  );
  TestValidator.equals("created sort_order", created.sort_order, sortOrder);
  TestValidator.equals("created status", created.status, status);
  TestValidator.equals(
    "created parent_id is null for root",
    created.parent_id,
    null,
  );

  // 3. Retrieve category by name (public, no authentication)
  const retrieved = await api.functional.shoppingMall.mallCategories.at(
    connection,
    {
      name: categoryName,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved id matches created id",
    retrieved.id,
    created.id,
  );
  TestValidator.equals("retrieved name", retrieved.name, created.name);
  TestValidator.equals(
    "retrieved description",
    retrieved.description,
    created.description,
  );
  TestValidator.equals(
    "retrieved sort_order",
    retrieved.sort_order,
    created.sort_order,
  );
  TestValidator.equals("retrieved status", retrieved.status, created.status);
  TestValidator.equals(
    "retrieved parent_id matches",
    retrieved.parent_id,
    created.parent_id,
  );
  TestValidator.equals(
    "retrieved created_at matches",
    retrieved.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at matches",
    retrieved.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "retrieved deleted_at matches",
    retrieved.deleted_at,
    created.deleted_at,
  );
}
