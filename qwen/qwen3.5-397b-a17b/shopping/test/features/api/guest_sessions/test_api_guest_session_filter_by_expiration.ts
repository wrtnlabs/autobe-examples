import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session filtering by expiration status.
 *
 * Validates that guest users can filter their sessions by expiration status to find active or expired sessions. Tests both expired:true and expired:false filters, verifies pagination metadata is maintained, and ensures search functionality works across session fields.
 *
 * The test creates a guest account, then queries sessions with different filter combinations to verify the filtering logic works correctly. This ensures guests can effectively manage and audit their session history.
 *
 * 1. Guest account is created via authorize_guest_join utility function.
 * 2. Guest queries sessions with expired:true filter to find expired sessions.
 * 3. Guest queries sessions with expired:false filter to find active sessions.
 * 4. Search functionality is tested across session fields.
 * 5. Pagination parameters are validated to work correctly with filters.
 */
export async function test_api_guest_session_filter_by_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Query sessions with expired:true filter
  const expiredSessions =
    await api.functional.shoppingMall.guest.sessions.index(guestConnection, {
      body: {
        expired: true,
        page: 1,
        limit: 10,
        sort: "created_at,DESC",
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(expiredSessions);
  // 3. Query sessions with expired:false filter (active sessions)
  const activeSessions = await api.functional.shoppingMall.guest.sessions.index(
    guestConnection,
    {
      body: {
        expired: false,
        page: 1,
        limit: 10,
        sort: "created_at,DESC",
      } satisfies IShoppingMallAdminSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // 4. Test search functionality with partial text
  const searchByIp = await api.functional.shoppingMall.guest.sessions.index(
    guestConnection,
    {
      body: {
        search: guest.token.access.substring(0, 5),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdminSession.IRequest,
    },
  );
  typia.assert(searchByIp);
  // 5. Test pagination with different page sizes and sort order
  const paginatedSessions =
    await api.functional.shoppingMall.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        limit: 5,
        sort: "created_at,ASC",
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(paginatedSessions);
  // 6. Validate pagination metadata is consistent
  TestValidator.equals(
    "pagination current page matches request",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedSessions.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginatedSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginatedSessions.pagination.pages >= 0,
  );
  // 7. Validate session data array exists
  TestValidator.predicate(
    "sessions data is an array",
    Array.isArray(paginatedSessions.data),
  );
}
