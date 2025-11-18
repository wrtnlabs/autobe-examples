import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestuserSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestuserSession";

/**
 * Validate that an admin can search guest user sessions by created_at range.
 *
 * Business goal: Ensure that the administrative guest session search endpoint
 * `/shoppingMall/admin/guestUsers/{guestUserId}/sessions` correctly interprets
 * the `created_from` and `created_to` filters in
 * `IShoppingMallGuestuserSession.IRequest`, and that the server returns only
 * sessions whose `created_at` timestamps fall within the requested inclusive
 * interval. Also ensure that when the requested interval is far in the future
 * where no sessions should exist, the server returns an empty page.
 *
 * High level steps:
 *
 * 1. Join an admin account using POST /auth/admin/join. This call both creates the
 *    admin and configures the SDK connection with an Authorization header via
 *    the returned token.
 * 2. Choose a target guestUserId (UUID) to query sessions for. As there is no
 *    guest user creation API in the current scope, we rely on a random UUID so
 *    the test focuses on schema correctness and server behavior rather than
 *    concrete fixture data.
 * 3. Build a wide time interval by computing `created_from` and `created_to` ISO
 *    8601 date-time strings where `created_from` is in the recent past and
 *    `created_to` is slightly in the future.
 * 4. Call PATCH /shoppingMall/admin/guestUsers/{guestUserId}/sessions with
 *    `page=1`, `limit=20`, and the created_at range, then assert that:
 *
 *    - The response conforms to IPageIShoppingMallGuestuserSession.ISummary via
 *         typia.assert.
 *    - All returned sessions have `created_at` within [created_from, created_to].
 * 5. Build a second time window far in the future (e.g. years ahead of now) and
 *    call the same endpoint again, asserting that `pagination.records` is 0 and
 *    `data` is an empty array, which validates server-side filtering for an
 *    interval that should match no rows.
 */
export async function test_api_admin_guestuser_sessions_search_with_created_at_range(
  connection: api.IConnection,
) {
  // 1. Admin joins and is authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a target guestUserId (random UUID)
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build a broad created_at time range around "now"
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24 hours ago
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours later

  const createdFrom: string & tags.Format<"date-time"> =
    past.toISOString() as string & tags.Format<"date-time">;
  const createdTo: string & tags.Format<"date-time"> =
    future.toISOString() as string & tags.Format<"date-time">;

  // 4. Call sessions.index with a wide interval and validate responses
  const wideRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallGuestuserSession.IRequest;

  const widePage: IPageIShoppingMallGuestuserSession.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: wideRequestBody,
      },
    );
  typia.assert(widePage);

  // Validate that each session’s created_at is within [createdFrom, createdTo]
  for (const session of widePage.data) {
    const createdAtTime = new Date(session.created_at).getTime();
    const fromTime = new Date(createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();

    TestValidator.predicate(
      "session created_at is within requested wide created_at range",
      createdAtTime >= fromTime && createdAtTime <= toTime,
    );
  }

  // 5. Call with a future-only interval where no sessions are expected
  const farFutureStart = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365); // +1 year
  const farFutureEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365 * 2); // +2 years

  const futureFrom: string & tags.Format<"date-time"> =
    farFutureStart.toISOString() as string & tags.Format<"date-time">;
  const futureTo: string & tags.Format<"date-time"> =
    farFutureEnd.toISOString() as string & tags.Format<"date-time">;

  const narrowRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    created_from: futureFrom,
    created_to: futureTo,
  } satisfies IShoppingMallGuestuserSession.IRequest;

  const narrowPage: IPageIShoppingMallGuestuserSession.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: narrowRequestBody,
      },
    );
  typia.assert(narrowPage);

  TestValidator.equals(
    "future-only created_at window should return zero records",
    narrowPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "future-only created_at window should return empty data array",
    narrowPage.data.length,
    0,
  );
}
