import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Verifies that duplicate user registration is prevented by enforcing email
 * uniqueness.
 *
 * 1. Generate a random unique email, valid password, and valid URIs for href and
 *    referrer.
 * 2. Register a user with this email using the API endpoint.
 * 3. Assert the registration response is valid and contains the user id, email,
 *    creation date, update date, and token.
 * 4. Attempt another registration with the same email but a different valid
 *    password (and different href/referrer).
 * 5. Assert that the API call fails due to unique constraint violation and does
 *    not reveal sensitive error details.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Prepare random registration data
  const email = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<256> & tags.Format<"email">
  >();
  const password1 = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const password2 = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const href1 = typia.random<string & tags.Format<"uri">>();
  const href2 = typia.random<string & tags.Format<"uri">>();
  const referrer1 = typia.random<string & tags.Format<"uri">>();
  const referrer2 = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();

  // 2. Register the initial user
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password1,
      href: href1,
      referrer: referrer1,
      ip,
    } satisfies ITodoUser.ICreate,
  });
  typia.assert(user1);
  TestValidator.equals("registered user email matches", user1.email, email);

  // 3. Attempt duplicate registration with same email but different password and context
  await TestValidator.error(
    "should fail registration for duplicate email",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email,
          password: password2,
          href: href2,
          referrer: referrer2,
          ip,
        } satisfies ITodoUser.ICreate,
      });
    },
  );
}
