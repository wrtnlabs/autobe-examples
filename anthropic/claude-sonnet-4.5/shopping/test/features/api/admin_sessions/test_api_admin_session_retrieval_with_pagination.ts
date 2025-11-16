import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test the complete workflow of retrieving a paginated list of admin
 * authentication sessions.
 *
 * This test validates that an authenticated admin can successfully query and
 * retrieve session records for a specific administrator with proper pagination
 * controls. The test creates an admin account which automatically generates a
 * session record, then retrieves the session list using pagination parameters
 * to verify the paginated response structure.
 *
 * Test workflow:
 *
 * 1. Create an admin account (automatically creates initial session)
 * 2. Retrieve admin sessions with pagination parameters
 * 3. Validate paginated response structure (data array and pagination metadata)
 * 4. Verify session summary fields (id, admin, ip, created_at, expired_at)
 * 5. Confirm pagination metadata (current, limit, records, pages)
 */
export async function test_api_admin_session_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account (generates initial session)
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Retrieve admin sessions with pagination parameters
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;

  const sessionRequest = {
    page: page,
    limit: limit,
  } satisfies IShoppingMallAdminSession.IRequest;

  const sessionPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: sessionRequest,
    });
  typia.assert(sessionPage);

  // Step 3: Verify pagination metadata matches request parameters
  TestValidator.equals(
    "pagination current page matches request",
    sessionPage.pagination.current,
    page,
  );

  TestValidator.equals(
    "pagination limit matches request",
    sessionPage.pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination records is non-negative",
    sessionPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages is non-negative",
    sessionPage.pagination.pages >= 0,
  );

  // Step 4: Verify session data relationship if sessions exist
  if (sessionPage.data.length > 0) {
    const firstSession = sessionPage.data[0];

    TestValidator.equals(
      "session admin ID matches created admin",
      firstSession.admin.id,
      admin.id,
    );
  }
}
