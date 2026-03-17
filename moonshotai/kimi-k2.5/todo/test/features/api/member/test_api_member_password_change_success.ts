import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member password change success workflow.
 *
 * 1. Create a new member connection to ensure isolated authentication context.
 * 2. Register a new member with a known password using the authorize_member_join utility (which establishes an authenticated session).
 * 3. Generate a new password for the change operation.
 * 4. Call the password update endpoint with the current password and new password.
 * 5. Validate that the response is a valid IMultiUserTodoMember (excluding password_hash).
 * The test verifies that an authenticated member can successfully change their password when providing the correct current password and a valid new password.
 */
export async function test_api_member_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for the member actor
  const memberConnection: api.IConnection = { host: connection.host };
  // Store current password for registration and password change verification
  const currentPassword = RandomGenerator.alphaNumeric(16);
  // Register and authenticate the member using utility function
  await authorize_member_join(memberConnection, {
    body: {
      password: currentPassword,
    },
  });
  // Generate new password for the change operation
  const newPassword = RandomGenerator.alphaNumeric(16);
  // Change password using the authenticated member connection
  const updatedMember =
    await api.functional.multiUserTodo.member.password.updatePassword(
      memberConnection,
      {
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        } satisfies IMultiUserTodoMember.IUpdatePassword,
      },
    );
  typia.assert(updatedMember);
}
