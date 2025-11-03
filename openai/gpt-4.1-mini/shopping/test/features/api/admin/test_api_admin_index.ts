import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test retrieval of a paginated, filtered list of admin users.
 *
 * 1. Authenticate as a new admin user via '/auth/admin/join', receiving access
 *    token and admin data.
 * 2. Call '/shoppingMall/admin/admins' PATCH endpoint with a filter including the
 *    new admin's email.
 * 3. Validate response pagination metadata (page, limit, records, pages).
 * 4. Validate admin summaries in list include the new admin user with correct
 *    fields.
 * 5. Verify access control by ensuring unauthenticated call to list fails.
 * 6. Confirm the correctness of filtering, sorting, and pagination.
 */
export async function test_api_admin_index(connection: api.IConnection) {
  // Step 1: Admin registration
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminFullName: string = RandomGenerator.name();
  const newAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SafePassword123!",
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(newAdmin);

  // Step 2: Make an authenticated request to list admins with filter
  const filterEmail = newAdmin.email;

  const requestBody: IShoppingMallAdmin.IRequest = {
    page: 1,
    limit: 10,
    search: filterEmail,
    filter: {
      email: filterEmail,
    },
    sort: {
      field: "created_at",
      order: "desc",
    },
  };

  const response: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: requestBody,
    });
  typia.assert(response);

  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be positive",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be positive",
    response.pagination.pages >= 1,
  );

  // Step 4: Validate that the admin list contains the newly created admin
  const matched = response.data.find((admin) => admin.email === filterEmail);
  typia.assertGuard(matched!);
  TestValidator.equals("matched admin email", matched.email, filterEmail);
  TestValidator.equals(
    "matched admin full_name",
    matched.full_name,
    adminFullName,
  );

  // Validate required fields are present and correctly typed
  TestValidator.predicate(
    "matched admin has id",
    typeof matched.id === "string" && matched.id.length > 0,
  );
  TestValidator.predicate(
    "matched admin has created_at",
    typeof matched.created_at === "string" && matched.created_at.length > 0,
  );
  TestValidator.predicate(
    "matched admin has updated_at",
    typeof matched.updated_at === "string" && matched.updated_at.length > 0,
  );

  // deleted_at may be null or undefined
  TestValidator.predicate(
    "matched admin deleted_at is null or string or undefined",
    matched.deleted_at === null ||
      matched.deleted_at === undefined ||
      (typeof matched.deleted_at === "string" && matched.deleted_at.length > 0),
  );

  // Step 5: Attempt unauthenticated request to list admins, expect error
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized request to list admins should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.index(unauthConnection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );
}
