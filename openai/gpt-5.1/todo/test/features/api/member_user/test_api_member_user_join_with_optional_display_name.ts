import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate member user registration with optional display_name propagation.
 *
 * Business goal:
 *
 * - Ensure POST /auth/memberUser/join accepts an optional display_name field,
 *   persists it, and returns it in the authorized context.
 * - Confirm other identity and token fields are correctly populated on first
 *   registration.
 *
 * Steps:
 *
 * 1. Build a valid ITodoAppMemberUserJoin.IRequest payload including:
 *
 *    - Email (random, valid email)
 *    - Password (random, password format)
 *    - Non-empty display_name
 *    - Href and referrer as valid URIs
 *    - Omit ip to let backend infer it.
 * 2. Call api.functional.auth.memberUser.join with this payload.
 * 3. Assert the response matches ITodoAppMemberuser.IAuthorized via typia.assert.
 * 4. Check that:
 *
 *    - Response.display_name is defined and equals request.display_name
 *    - Response.email equals request.email
 *    - Response.status is non-empty
 *    - Failed_login_count is 0
 *    - Created_at and updated_at are non-empty ISO date-time strings
 *    - Deleted_at is null on a fresh account
 *    - Token field is populated and matches IAuthorizationToken.
 */
export async function test_api_member_user_join_with_optional_display_name(
  connection: api.IConnection,
) {
  // 1. Prepare registration payload with optional display_name
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name(2);
  const href = "https://app.todo.example.com/signup";
  const referrer = "https://marketing.example.com/landing";

  const body = {
    email,
    password,
    display_name: displayName,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  // 2. Call join endpoint
  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body });

  // 3. Structural type assertion
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 4. Business rule validations

  // 4-1. display_name should be defined and round-trip
  await TestValidator.predicate(
    "display_name is defined on authorized context",
    async () =>
      authorized.display_name !== null && authorized.display_name !== undefined,
  );
  await TestValidator.predicate(
    "display_name equals requested value",
    async () => authorized.display_name === displayName,
  );

  // 4-2. email should match input
  TestValidator.equals(
    "email matches registration input",
    authorized.email,
    email,
  );

  // 4-3. status should be non-empty string
  await TestValidator.predicate(
    "status is non-empty string",
    async () => authorized.status.length > 0,
  );

  // 4-4. failed_login_count should be zero on first join
  await TestValidator.predicate(
    "failed_login_count is zero on fresh join",
    async () => authorized.failed_login_count === 0,
  );

  // 4-5. created_at and updated_at non-empty ISO date-time strings
  await TestValidator.predicate(
    "created_at is non-empty ISO date-time string",
    async () => authorized.created_at.length > 0,
  );
  await TestValidator.predicate(
    "updated_at is non-empty ISO date-time string",
    async () => authorized.updated_at.length > 0,
  );

  // 4-6. deleted_at is null for active account
  await TestValidator.predicate(
    "deleted_at is null on newly created account",
    async () => authorized.deleted_at === null,
  );

  // 4-7. token object structure and basic sanity
  typia.assert<IAuthorizationToken>(authorized.token);
  await TestValidator.predicate(
    "access token is non-empty string",
    async () => authorized.token.access.length > 0,
  );
  await TestValidator.predicate(
    "refresh token is non-empty string",
    async () => authorized.token.refresh.length > 0,
  );
}
