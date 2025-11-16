import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminSession";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate basic retrieval of a todoAdmin session detail record.
 *
 * Business goal:
 *
 * - Ensure that an authenticated todoAdmin can call the session detail endpoint
 *   using the SDK without type errors and receive a well-typed
 *   ITodoAppTodoAdminSession response.
 *
 * Technical constraints and adjustments:
 *
 * - The scenario description mentions correlating a concrete session row with
 *   earlier admin activity and verifying that the session belongs to the
 *   authenticated admin. However, in the provided SDK there is no endpoint to
 *   list sessions or expose the concrete session id that backs the current JWT.
 *   Also, the join() contract does not include a session id field in its
 *   ITodoAppTodoAdmin.IAuthorized response, and the token structure does not
 *   contain a session id either.
 * - Because of these constraints, we cannot deterministically discover a real,
 *   existing session id in a type-safe way. Attempting to guess session ids or
 *   abuse internal structures would either be non-compilable or logically
 *   brittle.
 * - Therefore, this test focuses on a realistic end-to-end authentication flow
 *   (join + an authenticated admin operation) and a single call to the
 *   session-detail endpoint using random UUIDs for both the todoAdminId and
 *   sessionId. This still validates that the endpoint wiring, type contracts,
 *   and authentication header handling are coherent in the SDK, even though we
 *   cannot assert strong business-level guarantees about the specific session
 *   row.
 *
 * Test steps:
 *
 * 1. Register a new todoAdmin via POST /auth/todoAdmin/join using
 *    api.functional.auth.todoAdmin.join.
 *
 *    - Build ITodoAppTodoAdminJoin.IRequest with realistic values:
 *
 *         - Email: random email string
 *         - Password: random string
 *         - DisplayName: optional random name
 *         - Ip: either random IPv4 string or null
 *         - Href/referrer: random valid URL strings
 *    - The join() call will set connection.headers.Authorization internally using
 *         the returned token.access.
 *    - Assert the returned ITodoAppTodoAdmin.IAuthorized with typia.assert.
 * 2. Perform an authenticated admin operation to ensure the connection is actually
 *    usable for privileged endpoints:
 *
 *    - Call POST /todoApp/todoAdmin/todoStatuses via
 *         api.functional.todoApp.todoAdmin.todoStatuses.create with a fully
 *         populated ITodoAppTodoStatus.ICreate request body.
 *    - Use RandomGenerator and typia.random to populate fields within valid ranges,
 *         including the sort_order int32 and boolean flags.
 *    - Assert the ITodoAppTodoStatus response with typia.assert.
 * 3. Invoke GET /todoApp/todoAdmin/todoAdmins/{todoAdminId}/sessions/{sessionId}
 *    via api.functional.todoApp.todoAdmin.todoAdmins.sessions.at:
 *
 *    - For todoAdminId, use a random UUID value (we cannot reuse the admin.id here
 *         as we do not know the real session id that belongs to them, and the
 *         simulator mode will accept any UUID).
 *    - For sessionId, also use a random UUID.
 *    - Assert the ITodoAppTodoAdminSession response with typia.assert. This ensures
 *         that ip, href, referrer, created_at and expired_at fields are
 *         structurally valid and conform to the declared schema.
 * 4. Perform basic semantic sanity checks on the ITodoAppTodoAdminSession:
 *
 *    - Using TestValidator.predicate, verify that:
 *
 *         - TodoAdmin.id is a non-empty string.
 *         - Ip is a non-empty string.
 *         - Href and referrer are non-empty strings.
 *         - Created_at is a non-empty string formatted as date-time (typia.assert already
 *                   covers the strict format; we only check that the field is
 *                   not blank).
 *    - For expired_at, only assert via typia that when present it respects the
 *         date-time format; do not enforce any specific temporal relation to
 *         created_at because we lack server-side guarantees and control over
 *         simulated data.
 * 5. Do not attempt to test HTTP status codes, error branches, or deliberate type
 *    validation failures, in accordance with the global testing rules.
 */
export async function test_api_todoadmin_session_detail_view_by_owner_admin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin via /auth/todoAdmin/join
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const authorizedAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedAdmin);

  // 2. Perform an authenticated admin operation: create a Todo status
  const statusCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    group: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >() satisfies number as number,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(createdStatus);

  // 3. Call the session-detail endpoint with random UUIDs for ids
  const todoAdminId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: ITodoAppTodoAdminSession =
    await api.functional.todoApp.todoAdmin.todoAdmins.sessions.at(connection, {
      todoAdminId,
      sessionId,
    });
  typia.assert(session);

  // 4. Basic semantic sanity checks on the session payload
  TestValidator.predicate(
    "session.todoAdmin.id should be a non-empty string",
    typeof session.todoAdmin.id === "string" && session.todoAdmin.id.length > 0,
  );

  TestValidator.predicate(
    "session.ip should be a non-empty string",
    typeof session.ip === "string" && session.ip.length > 0,
  );

  TestValidator.predicate(
    "session.href should be a non-empty string",
    typeof session.href === "string" && session.href.length > 0,
  );

  TestValidator.predicate(
    "session.referrer should be a non-empty string",
    typeof session.referrer === "string" && session.referrer.length > 0,
  );

  TestValidator.predicate(
    "session.created_at should be a non-empty string",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );

  // expired_at is already validated structurally by typia.assert; no additional
  // business-level checks are required here.
}
