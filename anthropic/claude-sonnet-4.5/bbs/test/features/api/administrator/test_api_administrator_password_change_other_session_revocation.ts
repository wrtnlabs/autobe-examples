import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test that changing password revokes all other active sessions while
 * maintaining the current session.
 *
 * This test validates the security measure of selective session revocation
 * during password changes. When an administrator changes their password, all
 * active sessions except the current one should be invalidated to prevent
 * unauthorized access, while allowing the user to continue working in their
 * current session without disruption.
 *
 * Steps:
 *
 * 1. Create an administrator account
 * 2. Establish multiple active sessions by logging in multiple times (simulating
 *    different devices)
 * 3. From one session (session1), change the password with valid credentials
 * 4. Verify the password change succeeds with appropriate confirmation message
 * 5. Verify the current session (session1) remains active by making an
 *    authenticated API call
 * 6. Verify other sessions (session2, session3) are revoked and cannot make
 *    authenticated calls
 * 7. Confirm that revoked sessions receive authentication errors
 */
export async function test_api_administrator_password_change_other_session_revocation(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const adminCreateData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: adminEmail,
    password: originalPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 2: Establish multiple active sessions by logging in multiple times
  // Session 1 - will be used for password change (current session)
  const session1Connection: api.IConnection = { ...connection, headers: {} };
  const session1 = await api.functional.auth.administrator.login(
    session1Connection,
    {
      body: {
        email: adminEmail,
        password: originalPassword,
      } satisfies IDiscussionBoardAdministrator.ILogin,
    },
  );
  typia.assert(session1);

  // Session 2 - simulating another device/browser (should be revoked)
  const session2Connection: api.IConnection = { ...connection, headers: {} };
  const session2 = await api.functional.auth.administrator.login(
    session2Connection,
    {
      body: {
        email: adminEmail,
        password: originalPassword,
      } satisfies IDiscussionBoardAdministrator.ILogin,
    },
  );
  typia.assert(session2);

  // Session 3 - simulating yet another device/browser (should be revoked)
  const session3Connection: api.IConnection = { ...connection, headers: {} };
  const session3 = await api.functional.auth.administrator.login(
    session3Connection,
    {
      body: {
        email: adminEmail,
        password: originalPassword,
      } satisfies IDiscussionBoardAdministrator.ILogin,
    },
  );
  typia.assert(session3);

  // Step 3: From session1, change the password
  const newPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const changePasswordResult =
    await api.functional.auth.administrator.password.change.changePassword(
      session1Connection,
      {
        body: {
          current_password: originalPassword,
          new_password: newPassword,
          new_password_confirm: newPassword,
        } satisfies IDiscussionBoardAdministrator.IChangePassword,
      },
    );
  typia.assert(changePasswordResult);

  // Step 4: Verify the password change succeeded
  TestValidator.predicate(
    "password change should return confirmation message",
    changePasswordResult.message.length > 0,
  );

  // Step 5: Verify the current session (session1) remains active and functional
  // The current session should be able to make authenticated API calls without re-login
  const verifyCurrentSession = await api.functional.auth.administrator.login(
    session1Connection,
    {
      body: {
        email: adminEmail,
        password: newPassword,
      } satisfies IDiscussionBoardAdministrator.ILogin,
    },
  );
  typia.assert(verifyCurrentSession);
  TestValidator.equals(
    "current session should remain functional after password change",
    verifyCurrentSession.id,
    admin.id,
  );

  // Step 6: Verify other sessions (session2 and session3) are revoked
  // These sessions should no longer be able to make authenticated API calls
  await TestValidator.error(
    "session2 should be revoked and fail authentication",
    async () => {
      await api.functional.auth.administrator.login(session2Connection, {
        body: {
          email: adminEmail,
          password: originalPassword,
        } satisfies IDiscussionBoardAdministrator.ILogin,
      });
    },
  );

  await TestValidator.error(
    "session3 should be revoked and fail authentication",
    async () => {
      await api.functional.auth.administrator.login(session3Connection, {
        body: {
          email: adminEmail,
          password: originalPassword,
        } satisfies IDiscussionBoardAdministrator.ILogin,
      });
    },
  );

  // Step 7: Verify new login with new password works (confirming password was actually changed)
  const newLoginConnection: api.IConnection = { ...connection, headers: {} };
  const newLogin = await api.functional.auth.administrator.login(
    newLoginConnection,
    {
      body: {
        email: adminEmail,
        password: newPassword,
      } satisfies IDiscussionBoardAdministrator.ILogin,
    },
  );
  typia.assert(newLogin);
  TestValidator.equals(
    "new login with new password should succeed",
    newLogin.id,
    admin.id,
  );
}
