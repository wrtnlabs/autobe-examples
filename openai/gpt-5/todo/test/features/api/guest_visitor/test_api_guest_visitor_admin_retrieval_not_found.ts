import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

/**
 * Admin-only retrieval of a Guest Visitor by non-existent ID must fail without
 * leaking details.
 *
 * Business goal:
 *
 * - Ensure that GET /todoList/systemAdmin/guestVisitors/{guestVisitorId} denies
 *   access for non-existent records with a neutral error (no status/message
 *   validation here), when invoked by an authenticated systemAdmin.
 *
 * Test flow:
 *
 * 1. SystemAdmin joins (registers) to obtain an authorization token via POST
 *    /auth/systemAdmin/join
 * 2. Generate a fresh random UUID that very likely does not exist
 * 3. Call the admin-only GET endpoint using that UUID and expect an error
 *
 * Technical constraints:
 *
 * - Use correct DTO variants (ITodoListSystemAdmin.ICreate for join body)
 * - Do not touch connection.headers (SDK manages Authorization automatically)
 * - Do not assert specific HTTP status codes or error messages; only assert that
 *   an error occurs
 * - If connection.simulate === true, the SDK returns random data instead of
 *   errors. In that case, just assert the returned structure to keep the test
 *   meaningful.
 */
export async function test_api_guest_visitor_admin_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1) Authenticate as systemAdmin (join issues token and SDK stores it automatically)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListSystemAdmin.ICreate;
  const authorized = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Prepare a UUID that is extremely unlikely to exist
  const missingId = typia.random<string & tags.Format<"uuid">>();

  // 3) Execute according to environment mode
  if (true === connection.simulate) {
    // In simulate mode, the endpoint returns random data instead of throwing
    const sample = await api.functional.todoList.systemAdmin.guestVisitors.at(
      connection,
      { guestVisitorId: missingId },
    );
    typia.assert(sample);
  } else {
    // In real backend mode, expect an error for non-existent ID
    await TestValidator.error(
      "admin get guestVisitor by non-existent id should fail",
      async () => {
        await api.functional.todoList.systemAdmin.guestVisitors.at(connection, {
          guestVisitorId: missingId,
        });
      },
    );
  }
}
