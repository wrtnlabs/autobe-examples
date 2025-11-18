import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates successful user registration and duplicate enforcement for
 * todo_app_users accounts using /auth/user/join.
 *
 * 1. Register a user by providing unique email, valid password (≥ 8 chars), href
 *    (current URL), referrer (previous URL), and optionally ip.
 * 2. Confirm the response includes id (UUID), email (format: email), created_at
 *    and updated_at timestamps, and a structured JWT token (access, refresh,
 *    expired_at, refreshable_until).
 * 3. Attempt registration again with the same email; expect a rejection and
 *    appropriate error.
 * 4. Optionally, test with a random (nullable) ip value in session context and
 *    ensure no response schema violation.
 *
 * This covers both the creation of a fresh account and schema-driven error
 * handling for duplicate registration attempts.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // 1. Prepare user registration input
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(12); // meets length requirements
  const currentHref = typia.random<string & tags.Format<"uri">>();
  const previousReferrer = typia.random<string & tags.Format<"uri">>();
  const withIp = Math.random() < 0.5;
  const randomIp:
    | (string & (tags.Format<"ipv4"> | tags.Format<"ipv6">))
    | null = withIp
    ? Math.random() < 0.5
      ? typia.random<string & tags.Format<"ipv4">>()
      : typia.random<string & tags.Format<"ipv6">>()
    : null;
  const joinRequest = {
    email: uniqueEmail,
    password: validPassword,
    href: currentHref,
    referrer: previousReferrer,
    ip: randomIp,
  } satisfies ITodoAppUser.IJoin;

  // 2. Register (should succeed)
  const authorized = await api.functional.auth.user.join(connection, {
    body: joinRequest,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "email in response matches input",
    authorized.email,
    uniqueEmail,
  );

  // 3. Re-attempt registration with same email (should fail)
  await TestValidator.error(
    "duplicate email registration is rejected",
    async () => {
      await api.functional.auth.user.join(connection, { body: joinRequest });
    },
  );

  // 4. Register a new user with only required session fields (no ip)
  const joinRequestNoIp = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip omitted (optional)
  } satisfies ITodoAppUser.IJoin;
  const authorizedNoIp = await api.functional.auth.user.join(connection, {
    body: joinRequestNoIp,
  });
  typia.assert(authorizedNoIp);
  TestValidator.equals(
    "email in response matches second input",
    authorizedNoIp.email,
    joinRequestNoIp.email,
  );
}
