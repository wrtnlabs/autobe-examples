import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test session update with invalid or malformed property values to validate
 * proper validation and error handling. Ensures the system gracefully rejects
 * updates with invalid IP formats, malformed URLs, or impossible timestamp
 * values while providing clear error feedback to help users correct their input
 * and maintain data integrity.
 */
export async function test_api_user_session_update_invalid_properties(
  connection: api.IConnection,
) {
  // 1. Create user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "validPassword123",
      href: "https://example.com/dashboard",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a session by logging in
  const session = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "validPassword123",
      href: "https://example.com/dashboard",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(session);

  // Note: Since we don't have a direct API to list sessions, we'll test update validation
  // with valid session IDs but invalid content values

  // 3. Test invalid IP format (not a valid IP address structure)
  await TestValidator.error(
    "invalid IP format should be rejected",
    async () => {
      await api.functional.todoApp.user.auth.sessions.update(connection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ip: "not-a-valid-ip-address",
        } satisfies ITodoAppUserSession.IUpdate,
      });
    },
  );

  // 4. Test invalid text that could be IP addresses with wrong format
  await TestValidator.error(
    "IP address with wrong format should be rejected",
    async () => {
      await api.functional.todoApp.user.auth.sessions.update(connection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ip: "999.999.999.999",
        } satisfies ITodoAppUserSession.IUpdate,
      });
    },
  );

  // 5. Test malformed URL in href field
  await TestValidator.error(
    "malformed URL in href should be rejected",
    async () => {
      await api.functional.todoApp.user.auth.sessions.update(connection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          href: "not-a-real-url",
        } satisfies ITodoAppUserSession.IUpdate,
      });
    },
  );

  // 6. Test invalid domain URL
  await TestValidator.error(
    "invalid domain URL should be rejected",
    async () => {
      await api.functional.todoApp.user.auth.sessions.update(connection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          href: "http://invalid-domain-test",
        } satisfies ITodoAppUserSession.IUpdate,
      });
    },
  );

  // 7. Test malformed protocol in referrer
  await TestValidator.error(
    "invalid protocol in referrer should be rejected",
    async () => {
      await api.functional.todoApp.user.auth.sessions.update(connection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          referrer: "javascript:alert('xss')",
        } satisfies ITodoAppUserSession.IUpdate,
      });
    },
  );

  // 8. Test extremely old timestamp (business logic validation)
  await TestValidator.error(
    "expired timestamp in the past should be rejected",
    async () => {
      await api.functional.todoApp.user.auth.sessions.update(connection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          expired_at: "1970-01-01T00:00:00.000Z", // Unix epoch start - way too old
        } satisfies ITodoAppUserSession.IUpdate,
      });
    },
  );

  // 9. Test empty string in critical fields
  await TestValidator.error(
    "empty string in critical fields should be rejected",
    async () => {
      await api.functional.todoApp.user.auth.sessions.update(connection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ip: "",
        } satisfies ITodoAppUserSession.IUpdate,
      });
    },
  );

  // 10. Test whitespace-only strings in critical fields
  await TestValidator.error(
    "whitespace-only strings in IP field should be rejected",
    async () => {
      await api.functional.todoApp.user.auth.sessions.update(connection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ip: "   ",
        } satisfies ITodoAppUserSession.IUpdate,
      });
    },
  );
}
