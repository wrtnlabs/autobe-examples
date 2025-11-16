import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_authentication_terminated_account_denied(
  connection: api.IConnection,
) {
  /**
   * Test authentication rejection with invalid moderator credentials.
   *
   * While the intended scenario is to test terminated moderator account
   * rejection, the available API only provides a login endpoint without account
   * creation or management capabilities. Therefore, this test verifies that the
   * system properly rejects login attempts with non-existent or invalid
   * credentials, which would also occur when attempting to authenticate with a
   * terminated account.
   *
   * The test validates that:
   *
   * 1. Login with non-existent moderator credentials fails with an error
   * 2. No authentication token is created for failed login attempts
   * 3. The connection remains unauthenticated after failed login
   */
  const invalidModeratorEmail = typia.random<string & tags.Format<"email">>();
  const invalidPassword = RandomGenerator.alphabets(16);
  const testHref = "https://moderator.example.com/login";
  const testReferrer = "https://example.com";

  /**
   * Attempt to authenticate with non-existent or invalid moderator credentials.
   * This simulates the scenario where a terminated moderator (whose account no
   * longer has 'active' status) attempts to log in. The system should reject
   * the authentication request.
   */
  await TestValidator.error(
    "authentication should fail for non-existent or invalid moderator credentials",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: invalidModeratorEmail,
          password: invalidPassword,
          href: testHref,
          referrer: testReferrer,
          ip: null,
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  /**
   * Verify that no authorization token was created in the connection headers.
   * This confirms that the failed authentication did not establish a session.
   */
  TestValidator.predicate(
    "no authorization token should be present after failed authentication",
    !connection.headers?.Authorization,
  );
}
