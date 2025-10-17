import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberDeactivate } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberDeactivate";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Verify that a newly registered todoMember can self-deactivate and that
 * subsequent access to member-only operations is blocked using the same token.
 *
 * Steps:
 *
 * 1. Register (join) a fresh member to obtain authenticated context
 *
 *    - Validate authorized payload (typia.assert)
 *    - Ensure account is active (deleted_at is null/undefined)
 * 2. Deactivate self
 *
 *    - Call POST /auth/todoMember/deactivate with optional reason
 *    - Validate security confirmation (typia.assert) and success === true
 * 3. Access blocked after deactivation
 *
 *    - Attempt to call the protected deactivate endpoint again with the same
 *         connection; must throw (authorization denied). Do not check HTTP
 *         status.
 * 4. Authentication is required for deactivation
 *
 *    - Clone an unauthenticated connection variant (headers: {}) and attempt
 *         deactivation; must throw.
 *
 * Notes:
 *
 * - Use precise DTO variants with `satisfies` for request bodies
 * - Never touch original connection.headers (SDK manages tokens automatically)
 * - Validate response schemas with typia.assert only; avoid extra type checks
 */
export async function test_api_todo_member_account_deactivation_blocks_authorized_access(
  connection: api.IConnection,
) {
  // 1) Register a fresh member (authenticated context established by SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoListTodoMemberJoin.ICreate;

  const authorized = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(authorized);

  // Ensure account is active (deleted_at null or undefined)
  TestValidator.predicate(
    "joined account should be active (deleted_at null/undefined)",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // 2) Self-deactivate
  const deactivateBody = {
    reason: RandomGenerator.paragraph({ sentences: 6 }), // under 500 chars typical
  } satisfies ITodoListTodoMemberDeactivate.ICreate;

  const security = await api.functional.auth.todoMember.deactivate(connection, {
    body: deactivateBody,
  });
  typia.assert<ITodoListTodoMember.ISecurity>(security);
  TestValidator.predicate(
    "deactivation success flag should be true",
    security.success === true,
  );

  // 3) Access blocked after deactivation (protected endpoint with same token)
  await TestValidator.error(
    "calling protected deactivate again after deactivation must fail",
    async () => {
      await api.functional.auth.todoMember.deactivate(connection, {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ITodoListTodoMemberDeactivate.ICreate,
      });
    },
  );

  // 4) Authentication is required: unauthenticated connection should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deactivation must fail",
    async () => {
      await api.functional.auth.todoMember.deactivate(unauthConn, {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoListTodoMemberDeactivate.ICreate,
      });
    },
  );
}
