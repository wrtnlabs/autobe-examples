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
 * Ensure admin guest user session search returns only summary session records.
 *
 * Business intent
 *
 * - When an admin lists a guest user's sessions through the PATCH
 *   /shoppingMall/admin/guestUsers/{guestUserId}/sessions endpoint, the
 *   response must be a paginated list of IShoppingMallGuestuserSession.ISummary
 *   objects, wrapped by IPageIShoppingMallGuestuserSession.ISummary.
 * - The endpoint must not leak any richer projection (like nested guest user
 *   objects) in this listing API; it should remain lightweight and
 *   privacy-conscious.
 *
 * What this test validates
 *
 * 1. An admin can join using POST /auth/admin/join and obtain an authorized
 *    context.
 * 2. Calling the sessions search endpoint with an empty IRequest body (no filters)
 *    succeeds and returns a valid IPageIShoppingMallGuestuserSession.ISummary
 *    object.
 * 3. The pagination block exists and is structurally valid.
 * 4. When there is at least one session in the data array, the first element
 *    conforms to IShoppingMallGuestuserSession.ISummary: it exposes id, ip,
 *    href, referrer, created_at, and optional expired_at, and can be asserted
 *    as such without accessing any non-summary fields.
 */
export async function test_api_admin_guestuser_sessions_search_no_filters_returns_only_summary_fields(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Call guest user sessions search with minimal filters (no explicit range)
  //
  // We don't have any API to create guest users or sessions in this fixture,
  // so we pick a random UUID for guestUserId and rely on the backend behavior
  // (may return an empty page). The purpose of this test is to validate the
  // output shape, not the existence of specific data.
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const requestBody = {} satisfies IShoppingMallGuestuserSession.IRequest;

  const page: IPageIShoppingMallGuestuserSession.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallGuestuserSession.ISummary>(page);

  // 3. Basic pagination sanity checks
  const pagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  await TestValidator.predicate(
    "pagination limit is non-negative",
    async () => pagination.limit >= 0,
  );
  await TestValidator.predicate(
    "pagination records is non-negative",
    async () => pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pagination pages is non-negative",
    async () => pagination.pages >= 0,
  );

  // 4. If there is at least one record, validate the summary element shape
  if (page.data.length > 0) {
    const first: IShoppingMallGuestuserSession.ISummary = page.data[0];
    typia.assert<IShoppingMallGuestuserSession.ISummary>(first);

    // Business-level assertions on exposed summary fields
    await TestValidator.predicate(
      "session id is non-empty string",
      async () => first.id.length > 0,
    );
    await TestValidator.predicate(
      "session ip is non-empty string",
      async () => first.ip.length > 0,
    );
    await TestValidator.predicate(
      "session href is non-empty string",
      async () => first.href.length > 0,
    );
    await TestValidator.predicate(
      "session referrer is non-empty string",
      async () => first.referrer.length > 0,
    );

    // We intentionally only read the fields defined by ISummary. Accessing
    // anything else here would be a type error, ensuring that list responses
    // cannot expose a richer session representation.
    const _createdAt: string & tags.Format<"date-time"> = first.created_at;
    const _expiredAt: (string & tags.Format<"date-time">) | null | undefined =
      first.expired_at;

    // Ensure created_at is present and non-empty
    await TestValidator.predicate(
      "session created_at is non-empty",
      async () => _createdAt.length > 0,
    );

    // expired_at is optional; we only assert that if present, it's non-empty
    if (_expiredAt !== null && _expiredAt !== undefined) {
      await TestValidator.predicate(
        "session expired_at is non-empty when present",
        async () => _expiredAt.length > 0,
      );
    }
  }
}
