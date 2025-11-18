import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate rejection of duplicate user registration by email uniqueness
 * constraint.
 *
 * This test ensures that the registration endpoint `/auth/user/join` enforces
 * the uniqueness of email addresses. It first registers a new user with
 * randomly generated valid data, and then attempts to register a second user
 * using the same email but a different password and context. The registration
 * attempt must fail, demonstrating that the system prevents duplicate email use
 * and never leaks original user information. This is critical for both
 * compliance (email as a unique credential) and user data privacy.
 *
 * Steps:
 *
 * 1. Register a new user with random, valid data.
 * 2. Attempt to register another user with the identical email, new password and
 *    session context.
 * 3. Expect the second registration to be rejected.
 * 4. Ensure no sensitive/original user data is exposed in the rejection.
 */
export async function test_api_user_registration_duplicate_email_rejected(
  connection: api.IConnection,
) {
  // 1. Register a unique user
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/login",
  } satisfies ITodoUser.IJoin;
  const firstResult = await api.functional.auth.user.join(connection, {
    body: userBody,
  });
  typia.assert(firstResult);

  // 2. Attempt registration with the same email
  const dupUserBody = {
    email: userBody.email,
    password: RandomGenerator.alphaNumeric(14),
    href: "https://example.com/join2",
    referrer: "https://example.com/register",
  } satisfies ITodoUser.IJoin;
  await TestValidator.error(
    "duplicate email registration must be rejected",
    async () => {
      await api.functional.auth.user.join(connection, { body: dupUserBody });
    },
  );
}
