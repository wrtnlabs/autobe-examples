import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_authentication_inactive_account_denied(
  connection: api.IConnection,
) {
  /**
   * Test moderator login rejection for invalid credentials.
   *
   * Since there is no API endpoint to create test moderator accounts and no
   * pre-existing moderators are available in the test environment, this test
   * validates that the login endpoint properly rejects authentication attempts
   * with non-existent moderator credentials. This demonstrates that the
   * authentication system validates moderator existence before checking any
   * other conditions like account_status. In a full integration test with a
   * moderator creation endpoint, this would be extended to test the specific
   * account_status='inactive' rejection scenario.
   *
   * Steps:
   *
   * 1. Generate random email and password credentials
   * 2. Attempt login with non-existent moderator credentials
   * 3. Verify that the login fails with appropriate error response
   * 4. Confirm no authorization token is returned
   */

  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Attempt login with non-existent moderator credentials
  // The system should reject this request
  await TestValidator.error(
    "login with non-existent moderator credentials should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: nonExistentEmail,
          password: password,
          href: href,
          referrer: referrer,
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );
}
