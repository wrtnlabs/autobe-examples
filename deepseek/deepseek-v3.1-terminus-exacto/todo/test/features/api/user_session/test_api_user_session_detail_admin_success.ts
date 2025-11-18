import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate admin's ability to retrieve full user session details after admin
 * registration.
 *
 * This test covers the following flow:
 *
 * 1. Register as a new admin and get a valid token.
 * 2. Prepare a dummy user session to simulate an existing user session (using
 *    typia.random for schema compliance).
 * 3. Call the admin session detail API
 *    (/todoList/admin/users/{userId}/sessions/{sessionId}) using the admin's
 *    valid token.
 * 4. Confirm that the response returns all required fields of
 *    ITodoListUserSession: id, user_id, ip, href, referrer, created_at, and
 *    expired_at matching schema.
 * 5. Validate that the returned object is a valid ITodoListUserSession
 *    (typia.assert).
 *
 * Note: Actual creation of a persistent user session record is not possible in
 * this isolated test since no user or session creation API is provided among
 * available endpoints or DTOs. Therefore, typia.random is used for plausible
 * inputs, and only schema-level response structure is validated, not persistent
 * database consistency or business linkage.
 */
export async function test_api_user_session_detail_admin_success(
  connection: api.IConnection,
) {
  // 1. Register as a new admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    },
  });
  typia.assert(admin);

  // 2. Prepare mock user session identifiers
  const userId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to retrieve session as admin
  const session = await api.functional.todoList.admin.users.sessions.at(
    connection,
    {
      userId,
      sessionId,
    },
  );
  // 4. Validate response schema
  typia.assert(session);
  // 5. Extra checks that all required fields are present and types are correct
  TestValidator.predicate(
    "session has id",
    typeof session.id === "string" && !!session.id,
  );
  TestValidator.predicate(
    "session has user_id",
    typeof session.user_id === "string" && !!session.user_id,
  );
  TestValidator.predicate(
    "session has ip",
    typeof session.ip === "string" && !!session.ip,
  );
  TestValidator.predicate(
    "session has href",
    typeof session.href === "string" && !!session.href,
  );
  TestValidator.predicate(
    "session has referrer",
    typeof session.referrer === "string",
  );
  TestValidator.predicate(
    "session has created_at",
    typeof session.created_at === "string" && !!session.created_at,
  );
  // expired_at may be null/undefined or a string (per schema)
}
