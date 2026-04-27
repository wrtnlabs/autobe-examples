import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session listing with status-based filtering.
 *
 * Validates that the guest sessions endpoint correctly filters sessions by their active/expired status. A guest joins the application, then requests sessions filtered by 'active', 'expired', and 'all' status values.
 *
 * For the 'active' filter, each returned session must have its `isActive` flag set to `true` and `expired_at` timestamp in the future. For the 'expired' filter, each returned session must have `isActive` set to `false` and `expired_at` in the past. The 'all' filter must return the total combined count of active and expired sessions.
 *
 * 1. Guest joins the application via `POST /todoApp/auth/guest/join`, obtaining an authenticated guest connection with a JWT access token.
 * 2. Calls `PATCH /todoApp/guest/sessions` with status filter set to `'active'`, asserting all returned sessions are active.
 * 3. Calls the same endpoint with status filter set to `'expired'`, asserting all returned sessions are expired.
 * 4. Calls the same endpoint with status filter set to `'all'`, asserting the total count matches the sum of active and expired results.
 */
export async function test_api_guest_sessions_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Filter by 'active' — only currently valid sessions
  const activeResult: IPageITodoAppMemberSession.ISummary =
    await api.functional.todoApp.guest.sessions.index(guestConnection, {
      body: {
        status: "active",
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(activeResult);
  for (const session of activeResult.data) {
    TestValidator.predicate(
      "active session has isActive=true",
      session.isActive === true,
    );
    const expiredAt: number = new Date(session.expired_at).getTime();
    const now: number = Date.now();
    TestValidator.predicate(
      "active session expired_at is in the future",
      expiredAt > now,
    );
  }
  // 3. Filter by 'expired' — sessions that have already lapsed
  const expiredResult: IPageITodoAppMemberSession.ISummary =
    await api.functional.todoApp.guest.sessions.index(guestConnection, {
      body: {
        status: "expired",
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(expiredResult);
  for (const session of expiredResult.data) {
    TestValidator.predicate(
      "expired session has isActive=false",
      session.isActive === false,
    );
    const expiredAt: number = new Date(session.expired_at).getTime();
    const now: number = Date.now();
    TestValidator.predicate(
      "expired session expired_at is in the past",
      expiredAt <= now,
    );
  }
  // 4. Filter by 'all' — no status filter applied
  const allResult: IPageITodoAppMemberSession.ISummary =
    await api.functional.todoApp.guest.sessions.index(guestConnection, {
      body: {
        status: "all",
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(allResult);
  TestValidator.equals(
    "all sessions count matches active + expired",
    allResult.data.length,
    activeResult.data.length + expiredResult.data.length,
  );
}
