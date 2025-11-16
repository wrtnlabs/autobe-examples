import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that platform admin registration enforces uniqueness on username and
 * email.
 *
 * Business goals:
 *
 * - Ensure that the first platform administrator can register successfully.
 * - Verify that attempting to register with a duplicate username is rejected.
 * - Verify that attempting to register with a duplicate email is rejected.
 * - Confirm that the system remains usable after conflict errors by allowing
 *   registration of a completely new unique admin.
 *
 * Test steps:
 *
 * 1. Create a baseline platform admin (U1, E1) via POST /auth/platformAdmin/join
 *    and assert the IAuthorized response.
 * 2. Attempt a second join with the same username U1 but a different email E2 and
 *    assert that it fails.
 * 3. Attempt a third join with a different username U2 but the same email E1 and
 *    assert that it fails.
 * 4. Perform a fourth join with a completely new username U3 and email E3 and
 *    assert success to ensure the system is still functioning normally.
 */
export async function test_api_platform_admin_join_enforces_username_and_email_uniqueness(
  connection: api.IConnection,
) {
  // 1. Successful baseline registration with unique username and email
  const username1: string = RandomGenerator.alphabets(12);
  const email1: string = typia.random<string & tags.Format<"email">>();

  const joinBody1 = {
    username: username1,
    email: email1,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin1 = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody1,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin1);

  // 2. Duplicate username (same U1, different E2) must be rejected
  const email2: string = typia.random<string & tags.Format<"email">>();
  const joinBodyDuplicateUsername = {
    username: username1, // same username as admin1
    email: email2, // new email
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      await api.functional.auth.platformAdmin.join(connection, {
        body: joinBodyDuplicateUsername,
      });
    },
  );

  // 3. Duplicate email (same E1, different U2) must be rejected
  const username2: string = RandomGenerator.alphabets(12);
  const joinBodyDuplicateEmail = {
    username: username2, // new username
    email: email1, // same email as admin1
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  await TestValidator.error("duplicate email should be rejected", async () => {
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBodyDuplicateEmail,
    });
  });

  // 4. Ensure system still accepts a fully unique new admin (U3, E3)
  const username3: string = RandomGenerator.alphabets(12);
  const email3: string = typia.random<string & tags.Format<"email">>();

  const joinBody3 = {
    username: username3,
    email: email3,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin3 = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody3,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin3);

  // Business-level consistency checks
  TestValidator.equals(
    "first admin username matches request",
    admin1.username,
    username1,
  );
  TestValidator.equals(
    "first admin email matches request",
    admin1.email,
    email1,
  );
  TestValidator.equals(
    "third admin username matches request",
    admin3.username,
    username3,
  );
  TestValidator.equals(
    "third admin email matches request",
    admin3.email,
    email3,
  );
}
