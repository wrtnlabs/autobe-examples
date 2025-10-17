import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPagination";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";

export async function test_api_administrator_change_password_invalidate_sessions(
  connection: api.IConnection,
) {
  // Validate administrator password change and observable session invalidation.
  //
  // NOTE (important): The provided SDK lacks a dedicated "login" endpoint and
  // an audit-log listing endpoint. Therefore, this test verifies
  // - successful password-change response, and
  // - observable session invalidation by asserting that previously issued
  //   tokens (which the SDK placed into the `connection` during join) are
  //   rejected for privileged operations.
  //
  // Together these behaviors provide strong evidence that the server:
  // 1) updated the password, and
  // 2) initiated session invalidation. If a login endpoint becomes available,
  // add an explicit authentication step with the new password to fully confirm
  // acceptance of the new credential. If audit APIs become available, add an
  // assertion for the presence of a password-change audit entry.

  // 1) Create fresh administrator account
  const originalPassword = RandomGenerator.alphaNumeric(12);
  const newPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const created: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: originalPassword,
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(created);

  // Record admin id and access token issued at join
  const adminId: string = created.id;
  const oldAccess: string = created.token.access;

  // 2) Precondition: list active sessions (body: null for listing)
  const sessionsBefore: IEconPoliticalForumAdministrator.ISessionsListResponse =
    await api.functional.auth.administrator.sessions.revoke.revokeSessions(
      connection,
      { body: null },
    );
  typia.assert(sessionsBefore);

  TestValidator.predicate(
    "at least one active session exists after join",
    sessionsBefore.data.length >= 1,
  );

  const recordedSessionId: string = sessionsBefore.data[0].id;

  // 3) Action: change password
  const changeResp: IEconPoliticalForumAdministrator.IChangePasswordResponse =
    await api.functional.auth.administrator.password.change.changePassword(
      connection,
      {
        body: {
          current_password: originalPassword,
          new_password: newPassword,
        } satisfies IEconPoliticalForumAdministrator.IChangePassword,
      },
    );
  typia.assert(changeResp);

  TestValidator.predicate(
    "password change reported success",
    changeResp.success === true,
  );

  // 4) Post-action validation: previous tokens must be invalidated.
  // Because the SDK placed the original access token into connection.headers during join(),
  // the current `connection` still carries the old token. After a successful
  // password change, calling a privileged endpoint using that same connection
  // should fail because sessions should have been invalidated.
  await TestValidator.error(
    "old access token must be rejected after password change",
    async () => {
      await api.functional.auth.administrator.sessions.revoke.revokeSessions(
        connection,
        { body: null },
      );
    },
  );

  // 5) Cleanup (best-effort): Try to revoke the previously recorded session
  // using the current connection. This call may fail because the token is
  // expected to be invalidated; the try/catch prevents cleanup failure from
  // causing test noise. Test environment should perform DB reset/teardown.
  try {
    await api.functional.auth.administrator.sessions.revoke.revokeSessions(
      connection,
      {
        body: {
          session_ids: [recordedSessionId],
        } satisfies IEconPoliticalForumAdministrator.ISessionsRevokeRequest,
      },
    );
  } catch {
    // If revocation fails due to token invalidation, ignore - test DB cleanup
    // policies should remove the test artifacts.
  }

  // End of test. The combination of: successful changePassword response and
  // rejection of previously issued tokens constitutes the test's pass criteria
  // given the available SDK surface.
}
