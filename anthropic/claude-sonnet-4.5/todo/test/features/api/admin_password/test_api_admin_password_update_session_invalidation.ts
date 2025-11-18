import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test password update invalidates other admin sessions except current one.
 *
 * This test validates the critical security feature that updating an
 * administrator's password invalidates all other active sessions except the
 * current one. The test creates multiple sessions for the same admin account
 * (simulating different devices), updates the password from one session, and
 * verifies that other sessions are invalidated while the current session
 * remains active.
 *
 * Steps:
 *
 * 1. Create a new admin account and authenticate (Session 1 - PRIMARY)
 * 2. Log in again with same credentials to establish Session 2 (SECONDARY)
 * 3. Log in third time to establish Session 3 (TERTIARY)
 * 4. From Session 1, update the admin password
 * 5. Verify password update succeeds and Session 1 remains valid
 * 6. Verify Session 2 token is invalidated (access should fail)
 * 7. Verify Session 3 token is invalidated (access should fail)
 * 8. Verify Session 1 still works with current token
 * 9. Verify login with old password fails
 * 10. Verify login with new password succeeds
 */
export async function test_api_admin_password_update_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create new admin account and authenticate (Session 1 - PRIMARY)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "AdminPass123!";
  const newPassword = "NewSecurePass456!";

  const connectionContext = {
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const session1Admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: originalPassword,
      ip: connectionContext.ip,
      href: connectionContext.href,
      referrer: connectionContext.referrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(session1Admin);

  // Session 1 connection with its own token
  const session1Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: session1Admin.token.access,
    },
  };

  // Step 2: Log in again to establish Session 2 (SECONDARY - simulating different device)
  const session2Admin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: originalPassword,
      ip: "192.168.1.101",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(session2Admin);

  const session2Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: session2Admin.token.access,
    },
  };

  // Step 3: Log in third time to establish Session 3 (TERTIARY - simulating another device)
  const session3Admin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: originalPassword,
      ip: "192.168.1.102",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(session3Admin);

  const session3Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: session3Admin.token.access,
    },
  };

  // Verify all three sessions have different tokens
  TestValidator.notEquals(
    "session 1 and session 2 have different access tokens",
    session1Admin.token.access,
    session2Admin.token.access,
  );
  TestValidator.notEquals(
    "session 1 and session 3 have different access tokens",
    session1Admin.token.access,
    session3Admin.token.access,
  );
  TestValidator.notEquals(
    "session 2 and session 3 have different access tokens",
    session2Admin.token.access,
    session3Admin.token.access,
  );

  // Step 4: From Session 1 (PRIMARY), update the admin password
  const updatedAdmin =
    await api.functional.todoList.admin.admins.me.password.update(
      session1Connection,
      {
        body: {
          current_password: originalPassword,
          new_password: newPassword,
        } satisfies ITodoListAdmin.IUpdatePassword,
      },
    );
  typia.assert(updatedAdmin);

  // Step 5: Verify password update succeeded and admin data is returned
  TestValidator.equals(
    "updated admin email matches original",
    updatedAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "updated admin id matches original",
    updatedAdmin.id,
    session1Admin.id,
  );

  // Step 6: Verify Session 2 token is invalidated (access should fail)
  await TestValidator.error(
    "session 2 should be invalidated after password change",
    async () => {
      await api.functional.todoList.admin.admins.me.password.update(
        session2Connection,
        {
          body: {
            current_password: newPassword,
            new_password: "AnotherPass789!",
          } satisfies ITodoListAdmin.IUpdatePassword,
        },
      );
    },
  );

  // Step 7: Verify Session 3 token is invalidated (access should fail)
  await TestValidator.error(
    "session 3 should be invalidated after password change",
    async () => {
      await api.functional.todoList.admin.admins.me.password.update(
        session3Connection,
        {
          body: {
            current_password: newPassword,
            new_password: "YetAnotherPass000!",
          } satisfies ITodoListAdmin.IUpdatePassword,
        },
      );
    },
  );

  // Step 8: Verify Session 1 still works with current token
  const verifySession1Admin =
    await api.functional.todoList.admin.admins.me.password.update(
      session1Connection,
      {
        body: {
          current_password: newPassword,
          new_password: "FinalPassword999!",
        } satisfies ITodoListAdmin.IUpdatePassword,
      },
    );
  typia.assert(verifySession1Admin);
  TestValidator.equals(
    "session 1 remains valid and can update password again",
    verifySession1Admin.id,
    session1Admin.id,
  );

  // Step 9: Verify login with old password fails
  await TestValidator.error("login with old password should fail", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: originalPassword,
        ip: "192.168.1.200",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ILogin,
    });
  });

  // Step 10: Verify login with new password succeeds (the final password after second update)
  const newSessionAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "FinalPassword999!",
      ip: "192.168.1.201",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(newSessionAdmin);
  TestValidator.equals(
    "new login with updated password succeeds",
    newSessionAdmin.email,
    adminEmail,
  );
}
