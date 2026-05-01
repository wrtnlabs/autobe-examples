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
 * Verify that an authenticated member can retrieve a paginated list of all their password reset tokens with default sorting.
 *
 * Validates the complete password reset token listing flow including member registration,
 * token generation, and authenticated retrieval. Ensures that the listing endpoint correctly
 * returns all tokens belonging to the authenticated member, sorted by creation date in
 * descending order.
 *
 * Special attention is given to verifying pagination metadata accuracy (total records count,
 * current page), the correct number of returned tokens, descending sort order by created_at,
 * and that recently created tokens within the validity window are marked as not expired.
 *
 * 1. Member joins via /auth/member/join, receiving authentication credentials.
 * 2. Member creates two password reset requests via /password-resets using their registered
 *    email, generating two reset tokens.
 * 3. Member calls PATCH /member/password-resets with an empty request body (no filters).
 * 4. Validates pagination metadata: records=2, current page=1.
 * 5. Validates both tokens are returned in the data array.
 * 6. Validates tokens are sorted by created_at in descending order (most recent first).
 * 7. Validates both tokens have expired=false since they are within the validity window.
 */
export async function test_api_password_reset_list_all_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create two password reset tokens using the member's email
  const resetConnection: api.IConnection = { host: connection.host };
  await generate_random_todo_app_password_resets_create(resetConnection, {
    body: { email: member.email },
  });
  await generate_random_todo_app_password_resets_create(resetConnection, {
    body: { email: member.email },
  });
  // 3. List all tokens with empty request body
  const result = await api.functional.todoApp.member.password_resets.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberPasswordReset.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.equals("total records count", result.pagination.records, 2);
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  // 5. Validate both tokens are returned
  TestValidator.equals("data contains 2 tokens", result.data.length, 2);
  // 6. Verify sorting: created_at descending (most recent first)
  const firstCreatedAt = new Date(result.data[0].created_at).getTime();
  const secondCreatedAt = new Date(result.data[1].created_at).getTime();
  TestValidator.predicate(
    "tokens sorted by created_at descending",
    firstCreatedAt >= secondCreatedAt,
  );
  // 7. Verify recently created tokens are not expired
  TestValidator.predicate(
    "first token is not expired",
    result.data[0].expired === false,
  );
  TestValidator.predicate(
    "second token is not expired",
    result.data[1].expired === false,
  );
}
