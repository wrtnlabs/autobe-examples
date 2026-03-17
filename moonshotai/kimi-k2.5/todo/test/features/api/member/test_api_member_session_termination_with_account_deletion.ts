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
 * Test logout behavior in the account termination workflow context.
 * When a member deletes their account, they are automatically logged out.
 * Verify that calling logout after account deletion (even though the
 * session should already be terminated) succeeds gracefully with idempotent behavior.
 */
export async function test_api_member_session_termination_with_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create a member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as a member to establish initial session
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Delete the member account - this implicitly terminates all sessions
  await api.functional.multiUserTodo.member.account.erase(memberConnection);
  // Step 3: Terminate session after account deletion
  // Should succeed gracefully with idempotent behavior (session already terminated)
  const result =
    await api.functional.multiUserTodo.member.sessions.terminate(
      memberConnection,
    );
  typia.assert(result);
}
