import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate that requesting children for a non-existent categoryId yields an
 * error and does not require authentication.
 *
 * Business context
 *
 * - Category browsing is designed to be public (no authentication required).
 * - When a client requests children for an unknown category, the backend should
 *   respond with a not-found style error rather than a 500-level internal
 *   error.
 * - The exact HTTP status code or error body is not asserted here; instead we
 *   assert the call fails (throws) for an invalid category id.
 *
 * Test steps
 *
 * 1. Bootstrap the system by joining an admin and creating at least one category
 *    via admin APIs to ensure the taxonomy is operational.
 * 2. Generate a random UUID that is extremely unlikely to match any real category
 *    id.
 * 3. Build an unauthenticated connection (clone of the incoming connection with
 *    empty headers) to simulate a public user.
 * 4. Invoke GET /shoppingMall/categories/{categoryId}/children with the random
 *    UUID using the unauthenticated connection.
 * 5. Verify, using TestValidator.error, that the call throws (indicating a
 *    not-found style behavior) instead of succeeding with a category summary.
 */
export async function test_api_category_children_not_found_for_invalid_category_id(
  connection: api.IConnection,
) {
  // 1. Admin join to ensure system is operational and to allow category creation
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create at least one real category via admin API (sanity check only)
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // 3. Generate a random UUID that should not correspond to any category
  const invalidCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Build an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Call children.index with invalid categoryId and expect an error
  await TestValidator.error(
    "children listing for invalid categoryId should fail",
    async () => {
      await api.functional.shoppingMall.categories.children.index(
        unauthenticatedConnection,
        {
          categoryId: invalidCategoryId,
        },
      );
    },
  );
}
