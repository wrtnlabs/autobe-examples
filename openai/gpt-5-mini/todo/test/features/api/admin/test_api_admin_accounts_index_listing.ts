import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdmin";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Verify admin accounts listing, filtering, pagination, and authorization.
 *
 * Business context:
 *
 * - Only admin actors should be able to retrieve the paginated list of
 *   administrative accounts. The listing endpoint supports filtering by role
 *   and isActive, sorting, and pagination.
 *
 * Test steps:
 *
 * 1. Create a primary admin (superadmin) via POST /auth/admin/join. SDK will set
 *    connection.headers.Authorization automatically.
 * 2. Create two more admins with different roles (support, moderator) to ensure
 *    listing returns multiple items.
 * 3. Call PATCH /todoApp/admin/admins (index) with pagination and validate
 *    response shape and pagination metadata.
 * 4. Apply role and isActive filters and validate results.
 * 5. Verify unauthorized access is rejected (no token).
 * 6. Verify invalid pagination parameters produce validation errors.
 */
export async function test_api_admin_accounts_index_listing(
  connection: api.IConnection,
) {
  // Helper to create an admin account and assert the authorized response
  const createAdmin = async (
    body: ITodoAppAdmin.ICreate,
  ): Promise<ITodoAppAdmin.IAuthorized> => {
    const authorized: ITodoAppAdmin.IAuthorized =
      await api.functional.auth.admin.join(connection, {
        body,
      });
    typia.assert(authorized);
    return authorized;
  };

  // 1) Create primary admin (superadmin)
  const primaryEmail = typia.random<string & tags.Format<"email">>();
  const primaryAdmin = await createAdmin({
    email: primaryEmail,
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
    role: "superadmin",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ICreate);
  // Ensure authorized payload contains id and token
  TestValidator.predicate(
    "primary admin has id",
    typeof primaryAdmin.id === "string" && primaryAdmin.id.length > 0,
  );
  typia.assert(primaryAdmin.token);

  // 2) Create additional admins to populate listing
  const supportEmail = typia.random<string & tags.Format<"email">>();
  const supportAdmin = await createAdmin({
    email: supportEmail,
    password: "SupportPwd123",
    display_name: RandomGenerator.name(),
    role: "support",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ICreate);

  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAdmin = await createAdmin({
    email: moderatorEmail,
    password: "ModPwd12345",
    display_name: RandomGenerator.name(),
    role: "moderator",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ICreate);

  // 3) Happy path: list admins with pagination
  const listing: IPageITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        order: "asc",
      } satisfies ITodoAppAdmin.IRequest,
    });
  typia.assert(listing);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    listing.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    listing.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    listing.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data contains at least one admin",
    Array.isArray(listing.data) && listing.data.length >= 1,
  );

  // Ensure created admins are present in returned data by matching emails
  const emails = listing.data.map((s) => s.email);
  TestValidator.predicate(
    "primary admin present in listing",
    emails.includes(primaryEmail),
  );
  TestValidator.predicate(
    "support admin present in listing",
    emails.includes(supportEmail),
  );
  TestValidator.predicate(
    "moderator admin present in listing",
    emails.includes(moderatorEmail),
  );

  // 4) Filtering: by role
  const supportOnly: IPageITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        role: "support",
        page: 1,
        pageSize: 10,
      } satisfies ITodoAppAdmin.IRequest,
    });
  typia.assert(supportOnly);
  TestValidator.predicate(
    "support filter returns only support role",
    supportOnly.data.every((d) => d.role === "support"),
  );

  // Filtering: by isActive=true (should return active accounts)
  const activeOnly: IPageITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        isActive: true,
        page: 1,
        pageSize: 10,
      } satisfies ITodoAppAdmin.IRequest,
    });
  typia.assert(activeOnly);
  TestValidator.predicate(
    "isActive filter returns only active accounts",
    activeOnly.data.every((d) => d.isActive === true),
  );

  // 5) Negative: unauthorized access (no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized without token", async () => {
    await api.functional.todoApp.admin.admins.index(unauthConn, {
      body: {} satisfies ITodoAppAdmin.IRequest,
    });
  });

  // 6) Negative: invalid pagination parameters (page=0 or negative pageSize)
  await TestValidator.error("invalid page param should fail", async () => {
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        page: 0,
      } satisfies ITodoAppAdmin.IRequest,
    });
  });

  await TestValidator.error("invalid pageSize should fail", async () => {
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        page: 1,
        pageSize: -5,
      } satisfies ITodoAppAdmin.IRequest,
    });
  });
}
