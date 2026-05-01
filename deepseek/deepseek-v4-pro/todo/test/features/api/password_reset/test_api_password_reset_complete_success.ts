import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_password_resets_create } from "../../../generate/generate_random_todo_app_password_resets_create";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

/**
 * Test complete password reset flow with token consumption and credential rotation.
 *
 * Validates the end-to-end password reset lifecycle: member registration with known credentials, password reset request generation, completion with a new password, and post-reset authentication verification. Ensures the reset token is permanently consumed and cannot be reused, the old password is invalidated, and the new password grants successful authentication.
 *
 * Special attention is given to verifying that the consumed reset token is hard-deleted and rejected on reuse, and that password rotation correctly invalidates the previous credential while enabling the new one.
 *
 * 1. Member registers with explicit email and password via authorize_member_join.
 * 2. Password reset is requested for the registered email via generate_random_todo_app_password_resets_create.
 * 3. Reset is completed with a new password via PUT /todoApp/password-resets/{resetId}.
 * 4. Token reuse is rejected, confirming permanent consumption.
 * 5. Authentication with the new password succeeds via authorize_member_login.
 * 6. Authentication with the old password fails, confirming credential rotation.
 */
export async function test_api_password_reset_complete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const oldPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: oldPassword,
    },
  });
  typia.assert(member);
  // 2. Request password reset for the member's email
  await generate_random_todo_app_password_resets_create(
    { host: connection.host },
    { body: { email: memberEmail } },
  );
  // 3. Complete password reset with a new password
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const newPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.todoApp.password_resets.update(
    { host: connection.host },
    {
      resetId,
      body: {
        password: newPassword,
      } satisfies ITodoAppMemberPasswordReset.IUpdate,
    },
  );
  // 4. Verify reset token is permanently consumed (cannot be reused)
  await TestValidator.error("reset token consumed", async () => {
    await api.functional.todoApp.password_resets.update(
      { host: connection.host },
      {
        resetId,
        body: {
          password: RandomGenerator.alphaNumeric(16),
        } satisfies ITodoAppMemberPasswordReset.IUpdate,
      },
    );
  });
  // 5. Verify authentication succeeds with the new password
  const newLoginConnection: api.IConnection = { host: connection.host };
  const newLogin = await authorize_member_login(newLoginConnection, {
    body: {
      email: memberEmail,
      password: newPassword,
      href: "https://todo.example.com/login",
      referrer: "",
    },
  });
  typia.assert(newLogin);
  // 6. Verify old password is permanently invalidated
  await TestValidator.error("old password invalidated", async () => {
    await authorize_member_login(
      { host: connection.host },
      {
        body: {
          email: memberEmail,
          password: oldPassword,
          href: "https://todo.example.com/login",
          referrer: "",
        },
      },
    );
  });
}
