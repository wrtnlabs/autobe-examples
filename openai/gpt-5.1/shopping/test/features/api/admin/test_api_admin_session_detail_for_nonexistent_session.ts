import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Validate that requesting an admin session detail with a non-existent
 * sessionId results in an HTTP error instead of a successful session payload.
 *
 * Business context:
 *
 * - Admins have session records stored in shopping_mall_admin_sessions.
 * - Operators must not be able to retrieve arbitrary or non-existent session
 *   records as if they were valid sessions.
 * - When an admin (or admin tooling) requests a specific session by id that does
 *   not exist for that admin, the API must reject the request with an error
 *   instead of returning a valid IShoppingMallAdminSession.
 *
 * Test steps:
 *
 * 1. Join an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context and a valid admin id.
 * 2. Generate a random UUID value for a fake sessionId that is extremely unlikely
 *    to correspond to an existing session for this admin.
 * 3. Call GET /shoppingMall/admin/admins/{adminId}/sessions/{sessionId} using the
 *    valid adminId and this fake sessionId.
 * 4. Assert that the call fails with an HTTP error rather than returning a
 *    successful IShoppingMallAdminSession payload. We do not assert specific
 *    HTTP status codes or introspect the payload, in accordance with the global
 *    E2E constraints.
 */
export async function test_api_admin_session_detail_for_nonexistent_session(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain a valid adminId and authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  // 2. Generate a random UUID for a fake sessionId
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Attempt to fetch a non-existent session and expect an HTTP error
  await TestValidator.error(
    "admin session detail request with non-existent sessionId should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.sessions.at(connection, {
        adminId: authorized.id,
        sessionId: fakeSessionId,
      });
    },
  );
}
