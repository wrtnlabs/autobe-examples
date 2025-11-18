import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that attempting to register a user with a duplicate email is
 * rejected.
 *
 * 1. Register a new user successfully with a random email.
 * 2. Attempt registration again using the same email but random data for other
 *    fields.
 * 3. Verify the first registration succeeds and credentials/tokens are returned.
 * 4. Verify the second registration with duplicate email fails with a clear error
 *    and no tokens or account are issued.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register the original user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ITodoListUser.IJoin;
  const firstResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(firstResult);

  // 2. Attempt registration with the same email
  const joinBodyDup = {
    email,
    password: RandomGenerator.alphaNumeric(14), // new password, same email
    ip: null,
    href: "https://example.com/dup_register",
    referrer: "https://example.com/signup",
  } satisfies ITodoListUser.IJoin;

  await TestValidator.error("duplicate email should be rejected", async () => {
    await api.functional.auth.user.join(connection, { body: joinBodyDup });
  });
}
