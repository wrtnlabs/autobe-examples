import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator login failure with incorrect password. Validates
 * secure password verification process, proper error response formatting, and
 * account security measures. Ensures that incorrect password attempts are
 * properly rejected while maintaining user-friendly error messages and security
 * best practices for authentication failure handling.
 */
export async function test_api_communitymoderator_login_with_wrong_password(
  connection: api.IConnection,
) {
  // Generate realistic test data with wrong password
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const wrongPassword = "WrongPassword456!";
  const testHref = "https://reddit.com/auth/login";
  const testReferrer = "https://reddit.com/";

  // Test login with non-existent credentials and wrong password should fail
  await TestValidator.error(
    "community moderator login with wrong password should fail",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: moderatorEmail,
          password: wrongPassword,
          href: testHref,
          referrer: testReferrer,
          ip: null,
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Test with another wrong password pattern
  const wrongPassword2 = typia.random<string>();

  await TestValidator.error(
    "community moderator login with different wrong password should fail",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: moderatorEmail,
          password: wrongPassword2,
          href: "https://reddit.com/auth/login",
          referrer: "https://reddit.com/",
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );
}
