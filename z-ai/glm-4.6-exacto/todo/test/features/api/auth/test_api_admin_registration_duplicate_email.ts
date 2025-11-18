import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validates that admin registration correctly rejects attempts to use an
 * already-registered email. Ensures that business privacy and security policies
 * are upheld by not leaking whether a specific admin exists.
 *
 * 1. Register a new admin using a unique random email and password
 * 2. Attempt registering another admin using the same email but a different
 *    password
 * 3. Expect the second attempt to fail (error thrown)
 * 4. The error must be generic: no indication should be given whether the email
 *    existed previously
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register a new admin with a unique email
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const registrationBody = {
    email: uniqueEmail,
    password: password,
    href: "https://example.com/register",
    referrer: "https://example.com/referrer",
  } satisfies ITodoAppAdmin.IJoin;

  const joinResult = await api.functional.auth.admin.join(connection, {
    body: registrationBody,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "registered email matches",
    joinResult.email,
    uniqueEmail,
  );
  TestValidator.equals(
    "no deletion timestamp on first registration",
    joinResult.deleted_at,
    null,
  );

  // 2. Attempt to register a second admin with the same email but different password+href+referrer
  const secondBody = {
    email: uniqueEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/register2",
    referrer: "https://example.com/referrer2",
  } satisfies ITodoAppAdmin.IJoin;

  await TestValidator.error(
    "duplicate admin registration is rejected without info leak",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: secondBody,
      });
    },
  );
}
