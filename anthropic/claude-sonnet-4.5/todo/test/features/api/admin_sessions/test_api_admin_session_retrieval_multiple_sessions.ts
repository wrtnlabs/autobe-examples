import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test admin session retrieval with multiple concurrent sessions.
 *
 * This test validates the admin session retrieval API by creating an admin
 * account, establishing multiple concurrent sessions through repeated login
 * operations with different connection contexts (simulating different devices
 * with unique IP addresses, URLs, and referrers), and then demonstrating the
 * session retrieval functionality.
 *
 * Note: Since the authentication APIs (join/login) return
 * ITodoListAdmin.IAuthorized which does not include session IDs, and there is
 * no session listing API available, this test focuses on:
 *
 * 1. Creating multiple concurrent admin sessions with different connection
 *    contexts
 * 2. Demonstrating that the session retrieval API works correctly when given a
 *    valid session ID
 * 3. Validating the structure and content of retrieved session data
 *
 * In a real-world scenario, session IDs would be obtained through additional
 * APIs (such as a session listing endpoint) or included in the authentication
 * response.
 */
export async function test_api_admin_session_retrieval_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with first session context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin@Pass123";

  const firstSessionContext = {
    ip: "192.168.1.100",
    href: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/home" satisfies string &
      tags.Format<"uri">,
  };

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: firstSessionContext.ip,
      href: firstSessionContext.href,
      referrer: firstSessionContext.referrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(registeredAdmin);

  // Step 2: Create second concurrent session with different context
  const secondSessionContext = {
    ip: "10.0.0.50",
    href: "https://admin.example.com/mobile/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/mobile" satisfies string &
      tags.Format<"uri">,
  };

  const secondLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: secondSessionContext.ip,
      href: secondSessionContext.href,
      referrer: secondSessionContext.referrer,
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(secondLogin);

  // Step 3: Create third concurrent session with different context
  const thirdSessionContext = {
    ip: "172.16.0.25",
    href: "https://admin.example.com/tablet/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/tablet/dashboard" satisfies string &
      tags.Format<"uri">,
  };

  const thirdLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: thirdSessionContext.ip,
      href: thirdSessionContext.href,
      referrer: thirdSessionContext.referrer,
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(thirdLogin);

  // Step 4: Demonstrate session retrieval API functionality
  // Note: In a complete implementation, session IDs would be obtained from:
  // - A session listing API (e.g., GET /admin/admins/me/sessions)
  // - Included in the authentication response
  // - Extracted from JWT token claims
  // For this test, we use a test session ID to demonstrate the retrieval mechanism
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  const retrievedSession =
    await api.functional.todoList.admin.admins.me.sessions.at(connection, {
      sessionId: testSessionId,
    });
  typia.assert(retrievedSession);

  // Step 5: Validate retrieved session structure
  TestValidator.predicate(
    "retrieved session has valid UUID",
    typeof retrievedSession.id === "string" && retrievedSession.id.length > 0,
  );

  TestValidator.predicate(
    "retrieved session has valid admin ID",
    typeof retrievedSession.todo_list_admin_id === "string" &&
      retrievedSession.todo_list_admin_id.length > 0,
  );

  TestValidator.predicate(
    "retrieved session has IP address",
    typeof retrievedSession.ip === "string" && retrievedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "retrieved session has href",
    typeof retrievedSession.href === "string" &&
      retrievedSession.href.length > 0,
  );

  TestValidator.predicate(
    "retrieved session has referrer",
    typeof retrievedSession.referrer === "string" &&
      retrievedSession.referrer.length > 0,
  );

  TestValidator.predicate(
    "retrieved session has created_at timestamp",
    typeof retrievedSession.created_at === "string" &&
      retrievedSession.created_at.length > 0,
  );

  // Verify that multiple logins were successful (demonstrating concurrent sessions)
  TestValidator.equals(
    "all admin responses have same admin ID",
    registeredAdmin.id,
    secondLogin.id,
  );

  TestValidator.equals(
    "second and third login admin IDs match",
    secondLogin.id,
    thirdLogin.id,
  );
}
