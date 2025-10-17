import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";

/**
 * Validate that a guest token cannot access the admin-only GuestVisitor
 * retrieval API.
 *
 * Steps:
 *
 * 1. Join as a guest visitor to obtain a valid JWT token and guestVisitorId.
 * 2. Attempt to GET /todoList/systemAdmin/guestVisitors/{guestVisitorId} with the
 *    guest token.
 * 3. Expect the call to fail (authorization enforced). Do not assert status codes.
 */
export async function test_api_guest_visitor_admin_retrieval_forbidden_for_guest(
  connection: api.IConnection,
) {
  // 1) Join as guest to get token and id
  const authorized = await api.functional.auth.guestVisitor.join(connection, {
    body: {} satisfies ITodoListGuestVisitor.ICreate,
  });
  typia.assert(authorized);

  // 2) Using guest token, attempt admin-only retrieval and expect an error
  await TestValidator.error(
    "guest cannot access admin-only guestVisitor read",
    async () => {
      await api.functional.todoList.systemAdmin.guestVisitors.at(connection, {
        guestVisitorId: authorized.id,
      });
    },
  );
}
