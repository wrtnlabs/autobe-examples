import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test password change with empty current password field.
 *
 * Validates that password change operation fails when current_password is
 * empty. This test ensures the API enforces required field validation for
 * security-sensitive operations. The current_password field is mandatory to
 * prevent unauthorized password changes and must be verified before allowing
 * password modification.
 *
 * Test workflow:
 *
 * 1. Create new contributor account with valid credentials
 * 2. Verify account is authenticated after registration
 * 3. Attempt password change with empty current_password
 * 4. Verify operation fails with validation error
 */
export async function test_api_contributor_password_change_empty_current_password(
  connection: api.IConnection,
) {
  // Generate test contributor credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const testPassword = "SecurePass123!@#"; // Meet password requirements: 8+ chars, uppercase, lowercase, number, special char
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Register new contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: testEmail,
        username: testUsername,
        password: testPassword,
        href: testHref,
        referrer: testReferrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Verify authentication succeeded
  TestValidator.equals(
    "registered contributor email matches",
    contributor.email,
    testEmail,
  );
  TestValidator.equals(
    "registered contributor username matches",
    contributor.username,
    testUsername,
  );
  TestValidator.predicate(
    "contributor is authenticated",
    () => !!contributor.token,
  );
  TestValidator.predicate(
    "contributor account is active",
    contributor.account_status === "active",
  );

  // Step 3: Attempt password change with empty current_password
  await TestValidator.error(
    "password change should fail with empty current_password",
    async () => {
      await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
        connection,
        {
          body: {
            current_password: "", // Empty password - should fail validation
            new_password: "NewSecurePass456!@#",
            password_confirmation: "NewSecurePass456!@#",
          } satisfies IDiscussionBoardContributor.IChangePassword,
        },
      );
    },
  );
}
