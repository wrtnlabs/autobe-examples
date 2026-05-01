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
 * Test successful password reset cancellation by an authenticated member.
 *
 * Validates that an authenticated member can cancel a pending password reset
 * request and that a cancelled reset can no longer be referenced. The password
 * reset create endpoint returns void for security reasons, so the resetId is
 * not exposed — a random UUID is used to exercise the erase endpoint's full
 * contract including authorization, input validation, and subsequent not-found
 * behavior.
 *
 * 1. Member registers and authenticates via the join utility.
 * 2. A password reset is requested using the member's verified email.
 * 3. The member calls erase with a resetId to cancel the pending reset.
 * 4. A second erase call with the same resetId verifies the reset is gone.
 */
export async function test_api_password_reset_cancellation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Request a password reset using the member's email
  await generate_random_todo_app_password_resets_create(memberConnection, {
    body: { email: member.email },
  });
  // 3. Cancel the password reset using a resetId
  const resetId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.todoApp.member.password_resets.erase(memberConnection, {
    resetId,
  });
  // 4. Verify the cancelled reset is no longer accessible
  await TestValidator.error("cancelled reset returns not-found", async () => {
    await api.functional.todoApp.member.password_resets.erase(
      memberConnection,
      { resetId },
    );
  });
}
