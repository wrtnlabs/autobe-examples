import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate that an administrator can retrieve a specific user session and
 * session trace metadata.
 *
 * 1. Register a new admin (join) with unique email/password and random session
 *    context (href/referrer/ip).
 * 2. Validate the join response, confirming admin identity and token issuance.
 * 3. Use the admin context to try retrieving a user session: pick random UUIDs for
 *    userId and sessionId (since this is a generated e2e test), simulate a
 *    session retrieval call.
 * 4. Validate that the response includes all audit-related fields: id, user
 *    (summary), ip, href, referrer, created_at, expired_at.
 * 5. Check that field formats (UUID, email, date-time) match expectations via
 *    typia.assert.
 * 6. (If possible, negative/permission case): Attempt retrieval as unauthenticated
 *    user, expect failure.
 */
export async function test_api_user_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(admin);
  TestValidator.equals(
    "returned email matches input",
    admin.email,
    joinInput.email,
  );
  // 2. Simulate session resource (no explicit create/register, just random UUIDs)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin retrieves session (should succeed or at least respond with audit metadata structure)
  const result: IDiscussionBoardUserSession =
    await api.functional.discussionBoard.admin.users.sessions.at(connection, {
      userId,
      sessionId,
    });
  typia.assert(result);
  // 4. Validate audit/audit-trace fields
  TestValidator.predicate(
    "session id is non-empty",
    typeof result.id === "string" && result.id.length > 0,
  );
  typia.assert(result.user); // user summary type
  TestValidator.predicate(
    "session ip exists",
    typeof result.ip === "string" && result.ip.length > 0,
  );
  TestValidator.predicate(
    "session href exists",
    typeof result.href === "string" && result.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer exists",
    typeof result.referrer === "string" && result.referrer.length > 0,
  );
  TestValidator.predicate(
    "session created_at format",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  // expired_at can be null/undefined or date-time
  if (result.expired_at !== null && result.expired_at !== undefined)
    TestValidator.predicate(
      "expired_at format",
      typeof result.expired_at === "string" && result.expired_at.length > 0,
    );
  // 5. (Negative) Try session retrieval as unauthenticated (should fail if permissions enforced)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated should not retrieve session",
    async () => {
      await api.functional.discussionBoard.admin.users.sessions.at(unauthConn, {
        userId,
        sessionId,
      });
    },
  );
}
