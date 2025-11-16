import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Ensure duplicate email registration for admin fails.
 *
 * This test verifies that the system prevents the creation of multiple admin
 * accounts with the same email address. It validates the enforcement of the
 * unique constraint on the email property at the API and database level.
 *
 * Steps:
 *
 * 1. Register a new admin with random, valid registration data.
 * 2. Attempt to register a second admin with the same email (but all other fields
 *    randomized as allowed).
 * 3. Assert that the second registration call fails (TestValidator.error) due to
 *    unique constraint violation.
 *
 * The primary assertion is that no second account can be created using a
 * duplicate email, and an error is produced immediately.
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register the initial admin with unique, valid email
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "!A";
  const href = "https://example.com/admin/register";
  const referrer = "https://example.com/login";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password: password satisfies string,
      href,
      referrer,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  TestValidator.equals("registered email should match", admin.email, email);

  // 2. Attempt duplicate registration with the same email
  const dupPassword = RandomGenerator.alphaNumeric(14) + "#B";
  const dupHref = "https://example.com/admin/register-again";
  const dupReferrer = "https://example.com/register";

  await TestValidator.error(
    "duplicate admin registration with existing email should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email,
          password: dupPassword satisfies string,
          href: dupHref,
          referrer: dupReferrer,
        } satisfies IDiscussionBoardAdmin.IJoin,
      });
    },
  );
}
