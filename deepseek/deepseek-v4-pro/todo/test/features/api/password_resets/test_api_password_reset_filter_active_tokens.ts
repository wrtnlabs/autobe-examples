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
 * Test that the active status filter returns only non-expired password reset tokens.
 *
 * Verifies that the PATCH /member/password-resets endpoint correctly filters tokens by their expiration status. When status="active" is specified, only tokens whose expired_at is in the future (i.e., not yet expired) should appear in the results.
 *
 * The test ensures that the computed expired flag is false for every returned token, that tokens are sorted by created_at descending despite the filter being applied, and that the pagination records count accurately reflects only the active subset.
 *
 * 1. Member joins via /auth/member/join to establish an authenticated session.
 * 2. Three password reset tokens are created for the member's email via /password-resets.
 * 3. Member queries /member/password-resets with body { status: "active" }.
 * 4. Validates every token in the response has expired === false.
 * 5. Validates tokens are sorted by created_at descending (most recent first).
 * 6. Validates pagination records count matches the data length.
 */
export async function test_api_password_reset_filter_active_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create multiple password reset tokens for the member
  const plainConnection: api.IConnection = { host: connection.host };
  await generate_random_todo_app_password_resets_create(plainConnection, {
    body: { email: member.email },
  });
  await generate_random_todo_app_password_resets_create(plainConnection, {
    body: { email: member.email },
  });
  await generate_random_todo_app_password_resets_create(plainConnection, {
    body: { email: member.email },
  });
  // 3. Query with active status filter
  const result: IPageITodoAppMemberPasswordReset.ISummary =
    await api.functional.todoApp.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 4. Verify every returned token is active
  TestValidator.predicate(
    "at least one active token returned",
    result.data.length > 0,
  );
  for (const token of result.data) {
    TestValidator.predicate(
      `token ${token.id} is not expired`,
      token.expired === false,
    );
  }
  // 5. Verify sorting by created_at descending (most recent first)
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      "sorted by created_at descending",
      result.data[i - 1].created_at >= result.data[i].created_at,
    );
  }
  // 6. Verify pagination records count matches active token count
  TestValidator.predicate(
    "pagination records matches active token count",
    result.pagination.records === result.data.length,
  );
}
