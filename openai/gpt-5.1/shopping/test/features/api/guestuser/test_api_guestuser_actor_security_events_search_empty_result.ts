import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate that searching actor security events for a specific guest user
 * returns an empty page when no events exist for that guest.
 *
 * Business context:
 *
 * - The platform records actor security events in a shared table and links them
 *   to guests via a guest-user linkage table.
 * - Admin-only tooling can search these events per guest user using a PATCH-based
 *   search endpoint with rich filters and pagination.
 * - When a brand-new guest user has no security events, the admin search endpoint
 *   must still return a valid, well-formed page object with zero records and an
 *   empty data array, not an error.
 *
 * Test flow:
 *
 * 1. Join an admin (A) using /auth/admin/join. This both creates the admin account
 *    and sets the Authorization header on the connection.
 * 2. Join a guest user (G) with /auth/guestUser/join to obtain a concrete guest
 *    user id for search. This temporarily switches Authorization to a guest
 *    token.
 * 3. Join another admin account (A2) to restore an admin Authorization token on
 *    the connection so that the subsequent admin endpoint call is properly
 *    authorized.
 * 4. Call PATCH /shoppingMall/admin/guestUsers/{guestUserId}/actorSecurityEvents
 *    using G's id and a simple IShoppingMallActorSecurityEvent.IRequest with
 *    only page and limit set.
 * 5. Assert that the response is a valid
 *    IPageIShoppingMallActorSecurityEvent.ISummary with:
 *
 *    - Pagination.records === 0
 *    - Data.length === 0
 *    - Pagination.current and pagination.limit echo the requested values
 *
 * This confirms that the system gracefully handles the no-events case for a
 * guest user without throwing errors and with consistent pagination metadata.
 */
export async function test_api_guestuser_actor_security_events_search_empty_result(
  connection: api.IConnection,
) {
  // 1. Create initial admin A (establish admin Authorization context)
  const adminJoinBody1 = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody1,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin1);

  // 2. Create guest user G (this will switch Authorization to guestUser)
  const guestJoinBody = {} satisfies IShoppingMallGuestUser.IJoin;
  const guest: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinBody,
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(guest);

  // 3. Re-join as admin (A2) to restore admin Authorization on connection
  const adminJoinBody2 = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody2,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin2);

  // 4. Search actor security events for guest G as admin
  const requestPage = 1;
  const requestLimit = 10;

  const searchRequest = {
    page: requestPage,
    limit: requestLimit,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const page: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.actorSecurityEvents.index(
      connection,
      {
        guestUserId: guest.id,
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(page);

  // 5. Validate that page is empty and pagination is consistent
  TestValidator.equals(
    "guest user security events search should return zero records",
    page.pagination.records,
    0,
  );

  TestValidator.equals(
    "guest user security events search should return empty data array",
    page.data.length,
    0,
  );

  TestValidator.equals(
    "pagination.current echoes requested page",
    page.pagination.current,
    requestPage,
  );

  TestValidator.equals(
    "pagination.limit echoes requested limit",
    page.pagination.limit,
    requestLimit,
  );

  TestValidator.predicate(
    "pagination.pages is non-negative in empty result",
    page.pagination.pages >= 0,
  );
}
