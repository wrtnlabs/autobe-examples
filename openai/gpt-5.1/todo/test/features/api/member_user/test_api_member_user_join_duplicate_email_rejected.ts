import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";

/**
 * Validate that duplicate memberUser registrations with the same email are
 * rejected by the join endpoint.
 *
 * Business goal:
 *
 * - Ensure the unique index on todo_app_memberusers.email is enforced at the API
 *   layer so that a second self-signup attempt with the same email does not
 *   create a second account.
 *
 * Scenario steps:
 *
 * 1. Construct a valid ITodoAppMemberUserJoin.ICreate payload with a randomly
 *    generated email, valid password, and realistic href/referrer.
 * 2. Call api.functional.auth.memberUser.join(connection, { body }) to register
 *    the first member user.
 *
 *    - Assert the response satisfies ITodoAppMemberUser.IAuthorized using
 *         typia.assert.
 *    - Optionally, check that the returned email equals the input email using
 *         TestValidator.equals.
 * 3. Construct a second ITodoAppMemberUserJoin.ICreate payload using the exact
 *    same email but a different password and a different displayName. All other
 *    fields (ip, href, referrer) can be different or identical, but must still
 *    satisfy the DTO constraints.
 * 4. Use TestValidator.error with an async callback to assert that a second call
 *    to api.functional.auth.memberUser.join with the duplicate email throws an
 *    error (HttpError coming from the SDK).
 *
 *    - The test must not inspect HTTP status codes or error messages, just assert
 *         that an error occurs.
 *
 * Constraints and rules:
 *
 * - Use only the provided imports: api, typia, tags, RandomGenerator,
 *   TestValidator, ArrayUtil, and the DTO types.
 * - Do not manipulate connection.headers directly; rely on the SDK to attach
 *   Authorization headers.
 * - Do not generate type-error scenarios (no wrong types, no missing required
 *   fields). Focus purely on business logic: the duplicate email must be
 *   rejected.
 * - All API calls must be awaited; TestValidator.error with async callbacks must
 *   itself be awaited.
 */
export async function test_api_member_user_join_duplicate_email_rejected(
  connection: api.IConnection,
) {
  // 1. First successful registration
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstJoinBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    // For ip, use a valid ipv4 or ipv6 string; we can just omit it or
    // explicitly set null since it is optional and nullable. Here we
    // set null explicitly to follow the DTO comment guidance.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const firstAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(firstAuthorized);

  // Verify that the email in the response matches the input email.
  TestValidator.equals(
    "first join returns authorized member with same email",
    firstAuthorized.email,
    email,
  );

  // 2. Second registration attempt with the same email but different credentials
  const secondJoinBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  await TestValidator.error(
    "duplicate email registration should be rejected",
    async () => {
      await api.functional.auth.memberUser.join(connection, {
        body: secondJoinBody,
      });
    },
  );
}
