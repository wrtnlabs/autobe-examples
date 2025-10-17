import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test administrator password change operation and security workflow.
 *
 * This test validates the complete administrator password change workflow,
 * ensuring that administrators can successfully change their passwords with
 * proper current password verification. While the backend system logs these
 * security events in the audit trail with event_type 'password_changed',
 * severity 'high', IP address, and metadata, this test focuses on validating
 * the password change operation itself completes successfully.
 *
 * Steps:
 *
 * 1. Create and register a new administrator account
 * 2. Authenticate as the administrator (automatic via join)
 * 3. Successfully change the administrator's password with valid credentials
 * 4. Verify that the password change operation completes successfully
 * 5. Confirm the success message indicates password change completion
 */
export async function test_api_administrator_password_change_security_audit_logging(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const originalPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: originalPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  TestValidator.predicate(
    "administrator should be created with valid ID",
    typeof admin.id === "string" && admin.id.length > 0,
  );

  TestValidator.predicate(
    "access token should be provided",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  const newPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const changeResult =
    await api.functional.auth.administrator.password.change.changePassword(
      connection,
      {
        body: {
          current_password: originalPassword,
          new_password: newPassword,
          new_password_confirm: newPassword,
        } satisfies IDiscussionBoardAdministrator.IChangePassword,
      },
    );
  typia.assert(changeResult);

  TestValidator.predicate(
    "password change result should contain success message",
    typeof changeResult.message === "string" && changeResult.message.length > 0,
  );
}
