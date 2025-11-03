import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAdmin";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate admin listing API with pagination and filtering by email, name,
 * role, and status.
 *
 * This test ensures that only signed-in admin users can retrieve the platform
 * administrator list. It first creates and authenticates an admin account, then
 * tests the admin listing endpoint with and without filters. It verifies
 * pagination metadata, ensures summaries are present and valid, and tests that
 * non-admin users are denied access.
 *
 * Steps:
 *
 * 1. Create a new admin account for authentication.
 * 2. As the authenticated admin, retrieve the admin list (no filters) and validate
 *    pagination and summary structure.
 * 3. Retrieve the admin list with various filters for email, name, role, status,
 *    and verify filtered results.
 * 4. Attempt admin list retrieval with an unauthenticated/unauthorized connection
 *    and expect an authorization error.
 */
export async function test_api_admin_admins_pagination_and_search(
  connection: api.IConnection,
) {
  // 1. Create new admin account and authenticate
  const adminJoin: IShoppingAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "locked",
    ] as const),
  };
  const adminOutput: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(adminOutput);

  // 2. As authenticated admin, list admins with no filters
  const requestBasic = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingAdmin.IRequest;
  const pageBasic = await api.functional.shopping.admin.admins.index(
    connection,
    { body: requestBasic },
  );
  typia.assert(pageBasic);
  TestValidator.predicate(
    "pagination contains at least one admin",
    pageBasic.data.length > 0,
  );
  typia.assert(pageBasic.data[0]);
  TestValidator.equals(
    "found admin email matches join email or is present in platform",
    pageBasic.data.some((a) => a.email === adminJoin.email),
    true,
  );

  // 3. Paginated search with filters (email, name, role, status)
  // Email filter
  const pageEmail = await api.functional.shopping.admin.admins.index(
    connection,
    {
      body: {
        ...requestBasic,
        search: adminJoin.email,
      } satisfies IShoppingAdmin.IRequest,
    },
  );
  typia.assert(pageEmail);
  TestValidator.predicate(
    "all admins have matching email in search filter",
    pageEmail.data.every(
      (a) =>
        a.email.includes(adminJoin.email) || adminJoin.email.includes(a.email),
    ),
  );
  // Name filter
  const pageName = await api.functional.shopping.admin.admins.index(
    connection,
    {
      body: {
        ...requestBasic,
        search: adminJoin.name,
      } satisfies IShoppingAdmin.IRequest,
    },
  );
  typia.assert(pageName);
  TestValidator.predicate(
    "all admins have matching name in search filter",
    pageName.data.every(
      (a) => a.name.includes(adminJoin.name) || adminJoin.name.includes(a.name),
    ),
  );
  // Role filter
  const pageRole = await api.functional.shopping.admin.admins.index(
    connection,
    {
      body: {
        ...requestBasic,
        role: adminJoin.role,
      } satisfies IShoppingAdmin.IRequest,
    },
  );
  typia.assert(pageRole);
  TestValidator.predicate(
    "all admins have matching role in filter",
    pageRole.data.every((a) => a.role === adminJoin.role),
  );
  // Status filter
  const pageStatus = await api.functional.shopping.admin.admins.index(
    connection,
    {
      body: {
        ...requestBasic,
        status: adminJoin.status,
      } satisfies IShoppingAdmin.IRequest,
    },
  );
  typia.assert(pageStatus);
  TestValidator.predicate(
    "all admins have matching status in filter",
    pageStatus.data.every((a) => a.status === adminJoin.status),
  );
  // 4. Attempt to retrieve admin list as non-admin, expect authorization error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin or unauthenticated actor cannot retrieve admin list",
    async () => {
      await api.functional.shopping.admin.admins.index(unauthConn, {
        body: requestBasic,
      });
    },
  );
}
