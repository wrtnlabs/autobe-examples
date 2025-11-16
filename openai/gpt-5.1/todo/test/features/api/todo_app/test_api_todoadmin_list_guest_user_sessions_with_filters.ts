import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { IPageITodoAppGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuserSession";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate filtered listing of guest user sessions for a specific guest user.
 *
 * This test exercises the administrative session listing endpoint PATCH
 * /todoApp/todoAdmin/guestUsers/{guestUserId}/sessions by creating a realistic
 * flow:
 *
 * 1. A todoAdmin account is registered so that privileged guest user search/list
 *    endpoints can be called.
 * 2. A guest user identity is implicitly created (or reused) by calling
 *    /auth/guestUser/join multiple times with the same external_reference and
 *    display_name but varying ip, href, and referrer values, resulting in
 *    multiple sessions linked to the same guest user.
 * 3. The todoAdmin uses PATCH /todoApp/todoAdmin/guestUsers with
 *    ITodoAppGuestUser.IRequest filters to find the guest user identity by its
 *    externalReference and obtain the concrete guestUserId.
 * 4. The test calls PATCH /todoApp/todoAdmin/guestUsers/{guestUserId}/sessions via
 *    api.functional.todoApp.todoAdmin.guestUsers.sessions.index with an
 *    ITodoAppGuestUserSession.IRequest body that sets:
 *
 *    - Page/limit for pagination,
 *    - Created_from/created_to around the created_at timestamps of the sessions
 *         belonging to this guest user,
 *    - Ip (or href/referrer) to a specific value used in a subset of the created
 *         sessions,
 *    - Order_by = "created_at" and order_direction = "desc".
 * 5. The response is asserted to:
 *
 *    - Contain only sessions for the targeted guestUserId,
 *    - Have every session matching the ip/href/referrer filter applied,
 *    - Have each session created_at within the specified range,
 *    - Be ordered in descending created_at order.
 *
 * Business rules verified:
 *
 * - Time-based created_from/created_to filters limit the result set to the
 *   correct creation window for sessions.
 * - Field filters on ip/href/referrer behave as expected for equality or partial
 *   matching (the test uses exact values that the server should treat as
 *   matching records created earlier).
 * - Sorting parameters order_by and order_direction control the sort order of
 *   sessions, with "created_at" and "desc" resulting in newest-first ordering.
 */
export async function test_api_todoadmin_list_guest_user_sessions_with_filters(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain admin authorization.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/register",
    referrer: "https://landing.todo-app.test/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create multiple guest sessions for a single logical guest user by
  //    reusing the same external_reference but varying contextual fields.
  const externalReference = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();

  type CreatedSession = {
    authorized: ITodoAppGuestUser.IAuthorized;
  };

  const createdSessions: CreatedSession[] = [];

  const baseHref = "https://todo-app.test/landing";
  const baseReferrer = "https://referrer.todo-app.test/";

  // Use a small, deterministic variety of ip/href/referrer values.
  const ips = ["192.168.0.1", "192.168.0.2", "10.0.0.1"] as const;
  const hrefs = [
    `${baseHref}?source=a`,
    `${baseHref}?source=b`,
    `${baseHref}?source=c`,
  ] as const;
  const referrers = [
    `${baseReferrer}campaign-a`,
    `${baseReferrer}campaign-b`,
    `${baseReferrer}campaign-c`,
  ] as const;

  // Create 6 sessions, some sharing the same ip/href/referrer combination.
  for (let i = 0; i < 6; ++i) {
    const joinBody = {
      external_reference: externalReference,
      display_name: displayName,
      ip: ips[i % ips.length],
      href: hrefs[i % hrefs.length],
      referrer: referrers[i % referrers.length],
    } satisfies ITodoAppGuestUserJoin.IRequest;

    const guestAuthorized: ITodoAppGuestUser.IAuthorized =
      await api.functional.auth.guestUser.join(connection, {
        body: joinBody,
      });
    typia.assert(guestAuthorized);

    createdSessions.push({ authorized: guestAuthorized });
  }

  // 3. As admin, search guest users by externalReference to find guestUserId.
  const guestSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    externalReference: externalReference,
  } satisfies ITodoAppGuestUser.IRequest;

  const guestPage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: guestSearchBody,
    });
  typia.assert(guestPage);

  const foundGuest = guestPage.data.find(
    (g) => g.external_reference === externalReference,
  );
  TestValidator.predicate(
    "guest user with externalReference must exist",
    () => foundGuest !== undefined,
  );
  if (!foundGuest) return;

  const guestUserId = foundGuest.id;

  // 4. Build filters for sessions listing.
  // We can't read created_at for individual sessions (no direct list yet),
  // so we use a wide created_at window around now to ensure coverage.
  const now = new Date();
  const past = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const future = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes later

  const createdFrom = past.toISOString() as string & tags.Format<"date-time">;
  const createdTo = future.toISOString() as string & tags.Format<"date-time">;

  // Choose a specific combination from the sessions we created to filter on.
  const targetIp = ips[0];
  const targetHref = hrefs[0];
  const targetReferrer = referrers[0];

  const sessionRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    order_by: "created_at",
    order_direction: "desc",
    created_from: createdFrom,
    created_to: createdTo,
    ip: targetIp,
    href: targetHref,
    referrer: targetReferrer,
  } satisfies ITodoAppGuestUserSession.IRequest;

  // 5. Call the guest user sessions listing endpoint.
  const sessionPage: IPageITodoAppGuestuserSession.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: sessionRequestBody,
      },
    );
  typia.assert(sessionPage);

  const sessions = sessionPage.data;

  // Basic sanity: all sessions should belong to the same guest user.
  for (const session of sessions) {
    TestValidator.equals(
      "session.guestUser.id must match filter guestUserId",
      session.guestUser.id,
      guestUserId,
    );
  }

  // All sessions must satisfy the ip/href/referrer filters exactly.
  for (const session of sessions) {
    TestValidator.equals(
      "session.ip must match filtered ip",
      session.ip,
      targetIp,
    );
    TestValidator.equals(
      "session.href must match filtered href",
      session.href,
      targetHref,
    );
    TestValidator.equals(
      "session.referrer must match filtered referrer",
      session.referrer,
      targetReferrer,
    );
  }

  // All sessions must lie within [created_from, created_to].
  for (const session of sessions) {
    const createdAtTime = new Date(session.created_at).getTime();
    const fromTime = new Date(createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();

    TestValidator.predicate(
      "session.created_at must be >= created_from",
      createdAtTime >= fromTime,
    );
    TestValidator.predicate(
      "session.created_at must be <= created_to",
      createdAtTime <= toTime,
    );
  }

  // Verify descending order by created_at.
  for (let i = 1; i < sessions.length; ++i) {
    const prev = new Date(sessions[i - 1].created_at).getTime();
    const curr = new Date(sessions[i].created_at).getTime();
    TestValidator.predicate(
      "sessions must be ordered by created_at desc",
      prev >= curr,
    );
  }
}
