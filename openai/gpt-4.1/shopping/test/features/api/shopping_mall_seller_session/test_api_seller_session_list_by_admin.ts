import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test that an admin can list all session records for a specific seller, with
 * correct pagination and filtering using various query parameters (e.g., date
 * range, expired status, IP filter). Validate that only an authenticated admin
 * can access this endpoint and the session records returned match the filter
 * conditions. Edge cases: no sessions found, some sessions expired, filtering
 * by specific IP.
 */
export async function test_api_seller_session_list_by_admin(
  connection: api.IConnection,
) {
  // Register and authenticate as admin to obtain credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Prepare a random sellerId (no guarantee sessions exist)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // List sessions with default pagination (no filters)
  let page: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId,
      body: {},
    });
  typia.assert(page);
  // Pagination must be present
  TestValidator.predicate(
    "pagination key exists",
    typeof page.pagination === "object" &&
      typeof page.pagination.current === "number",
  );
  // Data array of summaries must exist
  TestValidator.predicate("data array exists", Array.isArray(page.data));

  // Edge case: No sessions (likely result for random UUID sellerId)
  if (page.data.length === 0) {
    TestValidator.equals(
      "no sessions found for random seller",
      page.data.length,
      0,
    );
  } else {
    // Pagination: page 1, limit 1
    const pagedPage =
      await api.functional.shoppingMall.admin.sellers.sessions.index(
        connection,
        {
          sellerId,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 1 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          },
        },
      );
    typia.assert(pagedPage);
    TestValidator.equals(
      "pagination with limit=1",
      pagedPage.pagination.limit,
      1 as number,
    );
    TestValidator.equals(
      "pagination current page = 1",
      pagedPage.pagination.current,
      1 as number,
    );

    // Date filtering: sessions created after a threshold (should filter results)
    const dateThreshold = new Date().toISOString();
    const filteredByDate =
      await api.functional.shoppingMall.admin.sellers.sessions.index(
        connection,
        {
          sellerId,
          body: {
            start_at: dateThreshold,
          },
        },
      );
    typia.assert(filteredByDate);
    TestValidator.predicate(
      "all sessions created_at >= threshold",
      filteredByDate.data.every(
        (s) => new Date(s.created_at) >= new Date(dateThreshold),
      ),
    );

    // Expired filter: only expired sessions
    const filteredExpired =
      await api.functional.shoppingMall.admin.sellers.sessions.index(
        connection,
        {
          sellerId,
          body: {
            expired: true,
          },
        },
      );
    typia.assert(filteredExpired);
    TestValidator.predicate(
      "all sessions are expired",
      filteredExpired.data.every(
        (s) => s.expired_at !== null && s.expired_at !== undefined,
      ),
    );

    // IP filter: use IP from first available session (if present)
    if (page.data[0]?.ip) {
      const ip = page.data[0].ip;
      const filteredIp =
        await api.functional.shoppingMall.admin.sellers.sessions.index(
          connection,
          {
            sellerId,
            body: {
              ip,
            },
          },
        );
      typia.assert(filteredIp);
      TestValidator.predicate(
        "all sessions ip filter matches",
        filteredIp.data.every((s) =>
          s.ip.toLowerCase().includes(ip.toLowerCase()),
        ),
      );
    }
  }

  // Edge: try accessing as unauthenticated connection (must be forbidden)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot list seller sessions",
    async () => {
      await api.functional.shoppingMall.admin.sellers.sessions.index(
        unauthConn,
        {
          sellerId,
          body: {},
        },
      );
    },
  );
}
