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
 * Test sorting admin sessions by creation timestamp in ascending and descending
 * order.
 *
 * This test validates that administrators can retrieve their session history
 * sorted by creation timestamp in both ascending (oldest first) and descending
 * (newest first) order. This is essential for security monitoring and audit
 * analysis workflows.
 *
 * Note: Due to API endpoint limitations (no login endpoint available), this
 * test works with existing sessions in the system rather than creating multiple
 * new sessions.
 *
 * Test workflow:
 *
 * 1. Create an admin account through authentication join (creates first session)
 * 2. Retrieve sessions sorted by created_at in descending order (newest first)
 * 3. Validate the descending sort order on returned sessions
 * 4. Retrieve sessions sorted by created_at in ascending order (oldest first)
 * 5. Validate the ascending sort order on returned sessions
 * 6. Verify both queries return consistent results
 */
export async function test_api_admin_session_sorting_and_ordering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account (this creates the initial session)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "moderator",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve sessions sorted by created_at descending (newest first)
  const descendingResult: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(descendingResult);

  // Step 3: Validate descending order (newest first)
  TestValidator.predicate(
    "descending sort should return at least one session",
    descendingResult.data.length >= 1,
  );

  // Validate sort order if multiple sessions exist
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = new Date(descendingResult.data[i].created_at);
      const next = new Date(descendingResult.data[i + 1].created_at);

      TestValidator.predicate(
        `descending order: session ${i} created_at should be >= session ${i + 1} created_at`,
        current >= next,
      );
    }
  }

  // Step 4: Retrieve sessions sorted by created_at ascending (oldest first)
  const ascendingResult: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(ascendingResult);

  // Step 5: Validate ascending order (oldest first)
  TestValidator.predicate(
    "ascending sort should return at least one session",
    ascendingResult.data.length >= 1,
  );

  // Validate sort order if multiple sessions exist
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = new Date(ascendingResult.data[i].created_at);
      const next = new Date(ascendingResult.data[i + 1].created_at);

      TestValidator.predicate(
        `ascending order: session ${i} created_at should be <= session ${i + 1} created_at`,
        current <= next,
      );
    }
  }

  // Step 6: Verify both queries return consistent session counts
  TestValidator.equals(
    "both sort orders should return same number of sessions",
    descendingResult.data.length,
    ascendingResult.data.length,
  );

  // Step 7: Verify the admin ID matches in all returned sessions
  for (const session of descendingResult.data) {
    TestValidator.equals(
      "all sessions should belong to the created admin",
      session.admin.id,
      admin.id,
    );
  }
}
