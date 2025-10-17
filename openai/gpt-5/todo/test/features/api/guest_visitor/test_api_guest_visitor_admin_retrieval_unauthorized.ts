import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";

/**
 * Validate that unauthenticated access to systemAdmin guest visitor retrieval
 * is rejected.
 *
 * Steps:
 *
 * 1. Register a public guest visitor to obtain a valid UUID (guestVisitorId).
 * 2. Clone the connection into an unauthenticated connection (headers: {}).
 * 3. Attempt to GET /todoList/systemAdmin/guestVisitors/{guestVisitorId} without
 *    Authorization.
 * 4. Assert that the call fails due to missing authentication (no status code
 *    assertion).
 */
export async function test_api_guest_visitor_admin_retrieval_unauthorized(
  connection: api.IConnection,
) {
  // 1) Public guest join to obtain a valid UUID
  const authorized = await api.functional.auth.guestVisitor.join(connection, {
    body: {} satisfies ITodoListGuestVisitor.ICreate,
  });
  typia.assert<ITodoListGuestVisitor.IAuthorized>(authorized);

  // 2) Create unauthenticated connection (do not touch headers after creation)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Call admin-only endpoint without Authorization and expect failure
  await TestValidator.error(
    "admin endpoint should reject unauthenticated access",
    async () => {
      await api.functional.todoList.systemAdmin.guestVisitors.at(unauthConn, {
        guestVisitorId: authorized.id,
      });
    },
  );
}
