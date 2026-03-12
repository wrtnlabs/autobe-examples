import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest user can retrieve their active authentication sessions with default pagination settings.
 *
 * 1. Create guest connection and authenticate via authorize_guest_join
 * 2. List active sessions using default pagination (page=1, limit=20)
 * 3. Verify response structure and pagination metadata
 * 4. Verify all sessions are active and belong to the authenticated guest
 */
export async function test_api_guest_session_list_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. List active sessions with default pagination (empty body uses defaults)
  const sessions = await api.functional.shoppingMall.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IShoppingMallGuestSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", sessions.pagination.current, 1);
  TestValidator.equals("limit is 20", sessions.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is correctly calculated",
    sessions.pagination.pages ===
      Math.ceil(sessions.pagination.records / sessions.pagination.limit),
  );
  // 4. Verify sessions data
  TestValidator.predicate(
    "at least one session exists",
    sessions.data.length > 0,
  );
  // 5. Verify all sessions are active and belong to the authenticated guest
  await ArrayUtil.asyncForEach(sessions.data, async (session) => {
    typia.assert(session);
    // Verify session belongs to the authenticated guest (business logic)
    TestValidator.equals(
      "session belongs to authenticated guest",
      session.userId,
      guestAuth.id,
    );
    // Verify session is active (business logic)
    TestValidator.equals("session status is active", session.status, "active");
  });
}
