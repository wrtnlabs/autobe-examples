import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberDeactivate } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberDeactivate";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberRefresh";

/**
 * Refresh must be denied after member deactivation.
 *
 * Workflow:
 *
 * 1. Register a new todo member (join) to obtain access/refresh tokens.
 * 2. Capture the issued refresh token from the join response.
 * 3. Deactivate the same account (authenticated via SDK-managed Authorization).
 * 4. Attempt to refresh using the pre-deactivation refresh token.
 * 5. Expect an error (denial) without asserting specific status codes.
 *
 * Notes:
 *
 * - Never touch connection.headers; the SDK manages authentication headers.
 * - Validate response DTOs with typia.assert() where applicable.
 * - Use TestValidator.error with await for the async refresh denial check.
 */
export async function test_api_todo_member_refresh_denied_after_deactivation(
  connection: api.IConnection,
) {
  // 1) Register (join) to get initial tokens
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinBody = {
    email,
    password,
  } satisfies ITodoListTodoMemberJoin.ICreate;

  const authorized: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic sanity: newly joined member should be active (deleted_at nullish)
  TestValidator.predicate(
    "joined member is active (deleted_at is nullish)",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // Capture pre-deactivation refresh token
  const preDeactivationRefreshToken: string = authorized.token.refresh;

  // 2) Deactivate the member (authenticated context is already set by join)
  const deactivateBody = {
    // keep reason length modest to satisfy MaxLength<500>
    reason: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoListTodoMemberDeactivate.ICreate;

  const security: ITodoListTodoMember.ISecurity =
    await api.functional.auth.todoMember.deactivate(connection, {
      body: deactivateBody,
    });
  typia.assert(security);
  TestValidator.predicate("deactivation succeeded", security.success === true);

  // 3) Attempt to refresh using the pre-deactivation refresh token
  await TestValidator.error(
    "refresh should be denied after deactivation",
    async () => {
      await api.functional.auth.todoMember.refresh(connection, {
        body: {
          refresh_token: preDeactivationRefreshToken,
        } satisfies ITodoListTodoMemberRefresh.ICreate,
      });
    },
  );
}
