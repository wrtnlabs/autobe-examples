import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
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
 * Test user isolation for password reset token listing.
 *
 * Verifies that the PATCH /todoApp/member/password-resets endpoint correctly
 * scopes results to the authenticated member's own tokens only. Two different
 * members each create a password reset request, then each lists their tokens
 * to confirm no cross-user token leakage occurs.
 *
 * 1. Member A registers and authenticates via authorize_member_join.
 * 2. Member A creates a password reset token using generate_random_todo_app_password_resets_create with their own email.
 * 3. Member B registers and authenticates with a different email.
 * 4. Member B creates a password reset token using their own email.
 * 5. Member A lists their password reset tokens and verifies exactly 1 token is returned.
 * 6. Member B lists their password reset tokens and verifies exactly 1 token is returned.
 * 7. Cross-verify that the two token IDs are different, confirming no cross-user visibility.
 */
export async function test_api_password_reset_user_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a password reset token
  await generate_random_todo_app_password_resets_create(memberAConnection, {
    body: { email: memberA.email },
  });
  // 3. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member B creates a password reset token
  await generate_random_todo_app_password_resets_create(memberBConnection, {
    body: { email: memberB.email },
  });
  // 5. Member A lists their tokens
  const memberATokens =
    await api.functional.todoApp.member.password_resets.index(
      memberAConnection,
      { body: {} },
    );
  typia.assert(memberATokens);
  // 6. Verify Member A only sees their own token
  TestValidator.equals("member A token count", memberATokens.data.length, 1);
  TestValidator.equals(
    "member A pagination records",
    memberATokens.pagination.records,
    1,
  );
  // 7. Member B lists their tokens
  const memberBTokens =
    await api.functional.todoApp.member.password_resets.index(
      memberBConnection,
      { body: {} },
    );
  typia.assert(memberBTokens);
  // 8. Verify Member B only sees their own token
  TestValidator.equals("member B token count", memberBTokens.data.length, 1);
  TestValidator.equals(
    "member B pagination records",
    memberBTokens.pagination.records,
    1,
  );
  // 9. Cross-verify isolation: different tokens for different members
  TestValidator.notEquals(
    "cross-user token isolation",
    memberATokens.data[0].id,
    memberBTokens.data[0].id,
  );
}
