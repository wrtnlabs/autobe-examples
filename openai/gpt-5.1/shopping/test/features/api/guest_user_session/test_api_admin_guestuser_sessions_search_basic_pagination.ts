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
 * Validate that an authenticated admin can retrieve a paginated list of guest
 * user sessions for a specific guest user using minimal pagination parameters.
 *
 * Business flow:
 *
 * 1. Register a fresh admin account via POST /auth/admin/join.
 * 2. Rely on SDK side-effect to attach admin access token into connection headers.
 * 3. Call PATCH /shoppingMall/admin/guestUsers/{guestUserId}/sessions with a
 *    minimal IShoppingMallGuestuserSession.IRequest body (no filters, rely on
 *    defaults).
 * 4. Assert that the response matches IPageIShoppingMallGuestuserSession.ISummary
 *    and that pagination fields are non-negative and coherent.
 * 5. Assert that each entry in data matches
 *    IShoppingMallGuestuserSession.ISummary.
 *
 * Note: As we have no API to create guest users or sessions here, we focus on
 * structure and pagination invariants, not on enforcing that data belongs to a
 * specific prepared guest user.
 */
export async function test_api_admin_guestuser_sessions_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Admin joins (register + authenticate)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare minimal request body for guest user sessions search
  const requestBody = {
    // omit page/limit to rely on default pagination behavior
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallGuestuserSession.IRequest;

  // random guestUserId in UUID format (we don't control existence here)
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const page: IPageIShoppingMallGuestuserSession.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallGuestuserSession.ISummary>(page);

  // 3. Basic pagination invariants
  const pagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be positive or zero",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    pagination.pages >= 0,
  );

  // 4. Validate each session summary structure
  for (const session of page.data) {
    typia.assert<IShoppingMallGuestuserSession.ISummary>(session);

    TestValidator.predicate(
      "session.id must be non-empty UUID string",
      session.id.length > 0,
    );
    TestValidator.predicate(
      "session.ip must be non-empty string",
      session.ip.length > 0,
    );
    TestValidator.predicate(
      "session.href must be non-empty string",
      session.href.length > 0,
    );
    TestValidator.predicate(
      "session.referrer must be non-empty string",
      session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session.created_at must be non-empty string",
      session.created_at.length > 0,
    );
  }
}
