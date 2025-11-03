import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Verify successful user self-registration with unique email and token
 * issuance.
 *
 * This test validates the happy-path flow of user registration using POST
 * /auth/user/join. It confirms:
 *
 * 1. A new user can register with a unique email and compliant password
 * 2. The API returns authorized context (ITodoUser.IAuthorized) including token
 * 3. The returned email matches the requested email
 * 4. A second registration attempt with the same email is rejected (business rule)
 *
 * Notes:
 *
 * - Only the join API is provided in the SDK. Therefore, we validate token
 *   presence/shape and uniqueness behavior, but we do not call other protected
 *   endpoints or logout.
 * - Authentication headers are auto-managed by the SDK; this test never touches
 *   connection.headers directly.
 */
export async function test_api_user_registration_unique_email_success(
  connection: api.IConnection,
) {
  // Prepare join request body following ITodoUser.IJoin
  const email = typia.random<string & tags.Format<"email">>();

  // Strong password: at least 8 chars, includes letters and digits
  const passwordDigits: string = typia
    .random<
      number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<99>
    >()
    .toString();
  const password: string = `${RandomGenerator.alphabets(6)}${passwordDigits}`; // e.g., "abcdef42"

  // URIs for session context
  const href: string = typia.random<
    string & tags.Format<"uri">
  >() satisfies string as string;
  const referrer: string = typia.random<
    string & tags.Format<"uri">
  >() satisfies string as string;

  const joinBody = {
    email,
    password,
    href,
    referrer,
  } satisfies ITodoUser.IJoin;

  // Execute join
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorized);

  // Validate response content
  TestValidator.equals(
    "returned email matches requested email",
    authorized.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "access token is a non-empty string",
    authorized.token.access.length > 0,
  );

  // Negative case: duplicate email should fail
  await TestValidator.error(
    "duplicate email registration should be rejected",
    async () => {
      await api.functional.auth.user.join(connection, { body: joinBody });
    },
  );
}
