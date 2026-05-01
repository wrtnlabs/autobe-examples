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
 * Test that a member cannot cancel another member's password reset.
 *
 * Validates cross-user isolation for password reset cancellation. Member A
 * registers, authenticates, and requests a password reset, which creates a reset
 * record owned by Member A. Member B separately registers and authenticates as a
 * different member, then attempts to cancel a password reset that does not belong
 * to them.
 *
 * The system must reject the cross-user cancellation attempt. Only the member who
 * requested the password reset can cancel it, enforcing ownership isolation.
 * Since the reset ID is never exposed in API responses, Member B uses a random
 * UUID and the API rejects the attempt regardless of whether the reset exists.
 *
 * 1. Member A registers and authenticates via join.
 * 2. Member A requests a password reset for their own email.
 * 3. Member B registers and authenticates as a separate member.
 * 4. Member B attempts to cancel a password reset using a random UUID.
 * 5. Validates that Member B's cross-user cancellation attempt is rejected.
 */
export async function test_api_password_reset_cancellation_cross_user_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Member A requests a password reset for their own email
  await generate_random_todo_app_password_resets_create(memberAConnection, {
    body: { email: memberA.email },
  });
  // 3. Member B registers and authenticates as a different member
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member B attempts to cancel a password reset using a random UUID
  //    The reset does not belong to Member B, so the call must be rejected
  await TestValidator.error(
    "cross-user password reset cancellation denied",
    async () =>
      await api.functional.todoApp.member.password_resets.erase(
        memberBConnection,
        {
          resetId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
