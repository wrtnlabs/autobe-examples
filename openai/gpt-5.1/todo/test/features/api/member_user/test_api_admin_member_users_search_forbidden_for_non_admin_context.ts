import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";

/**
 * Verify that the admin-only member user search endpoint rejects access when
 * called from a non-admin (unauthenticated) context.
 *
 * Business context:
 *
 * - The PATCH /todoApp/adminUser/memberUsers endpoint is reserved for
 *   administrative users (adminUser actor).
 * - Only authenticated adminUser sessions (established via POST
 *   /auth/adminUser/join or equivalent) may invoke this endpoint to search and
 *   paginate member users.
 * - Any non-admin or unauthenticated context must be blocked from accessing this
 *   endpoint to preserve role-based access control.
 *
 * Test workflow:
 *
 * 1. (Sanity) Use the provided `connection` to join as an adminUser and verify
 *    that the member user search endpoint works in an authenticated admin
 *    context.
 * 2. Construct a new connection object that mimics a non-admin context by clearing
 *    headers (no Authorization token).
 * 3. Attempt to call PATCH /todoApp/adminUser/memberUsers with this
 *    unauthenticated connection and a simple ITodoAppMemberUser.IRequest body
 *    (page: 1, limit: 5).
 * 4. Assert that the call fails by using TestValidator.error, without checking
 *    specific HTTP status codes, only that an error occurs.
 *
 * This validates that the endpoint enforces admin-only access and does not
 * allow anonymous or non-admin callers to retrieve member user data.
 */
export async function test_api_admin_member_users_search_forbidden_for_non_admin_context(
  connection: api.IConnection,
) {
  // 1. Sanity: establish an adminUser session and verify that the
  //    member user search endpoint works in an authenticated context.
  const adminJoinInput = typia.random<ITodoAppAdminUser.IJoin>();

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  const adminSearchResponse: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppMemberUser.IRequest,
    });
  typia.assert(adminSearchResponse);

  // Basic sanity check on pagination fields to ensure endpoint behaves
  // normally in admin context.
  TestValidator.predicate(
    "admin context: pagination current page is non-negative",
    adminSearchResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "admin context: pagination limit is positive",
    adminSearchResponse.pagination.limit > 0,
  );

  // 2. Build a non-admin/unauthenticated connection by cloning the
  //    existing connection but providing an empty headers object.
  //    Do not touch `connection.headers` directly, as the SDK manages it.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to call the admin-only endpoint with the unauthenticated
  //    connection. This should fail due to missing adminUser
  //    authorization.
  await TestValidator.error(
    "non-admin (unauthenticated) context cannot access admin-only member user search",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.index(
        unauthConnection,
        {
          body: {
            page: 1,
            limit: 5,
          } satisfies ITodoAppMemberUser.IRequest,
        },
      );
    },
  );
}
