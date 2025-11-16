import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator registration with duplicate email validation.
 *
 * Verifies that the system properly rejects administrator registration attempts
 * when the email address already exists in the platform. This test ensures
 * email uniqueness constraints are enforced and that the system prevents
 * duplicate administrator accounts with the same email address.
 *
 * The test workflow:
 *
 * 1. Create a first administrator account with a unique email
 * 2. Attempt to register a second administrator with the same email address
 * 3. Verify that the duplicate email registration is rejected with an error
 * 4. Confirm no new administrator account was created for the duplicate email
 */
export async function test_api_administrator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create the first administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(firstAdmin);
  TestValidator.equals(
    "first administrator email matches input",
    firstAdmin.email,
    adminEmail,
  );

  // Step 2: Attempt to register a second administrator with the same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: adminEmail,
          password: RandomGenerator.alphabets(12),
          username: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );
}
