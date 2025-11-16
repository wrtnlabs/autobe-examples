import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator login with session tracking metadata.
 *
 * This test validates that the moderator login endpoint properly captures and
 * processes session tracking information including IP address, href (current
 * page URL), and referrer (previous page URL). It creates a moderator account
 * first, then performs a login operation with complete session context to
 * verify that authentication succeeds and session metadata is correctly
 * handled.
 *
 * Steps:
 *
 * 1. Create a moderator account with registration data
 * 2. Perform login with session tracking information (IP, href, referrer)
 * 3. Verify login succeeds and returns complete moderator profile
 * 4. Validate JWT token structure and expiration timestamps
 */
export async function test_api_moderator_login_session_tracking(
  connection: api.IConnection,
) {
  // Step 1: Generate test data for moderator registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureP@ssw0rd123";
  const moderatorNickname = RandomGenerator.name();

  // Generate session tracking data
  const registrationIp = "192.168.1.100";
  const registrationHref = typia.random<string & tags.Format<"uri">>();
  const registrationReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create moderator account
  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        ip: registrationIp,
        href: registrationHref,
        referrer: registrationReferrer,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });

  typia.assert(createdModerator);

  // Step 3: Generate session tracking data for login
  const loginIp = "10.0.0.50";
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 4: Perform login with session tracking information
  const loggedInModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: loginIp,
        href: loginHref,
        referrer: loginReferrer,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    });

  // Step 5: Validate login response
  typia.assert(loggedInModerator);

  // Step 6: Verify moderator profile information matches
  TestValidator.equals(
    "logged in moderator email matches",
    loggedInModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "logged in moderator nickname matches",
    loggedInModerator.nickname,
    moderatorNickname,
  );

  // Step 7: Verify token structure is complete
  TestValidator.predicate(
    "access token is present",
    loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loggedInModerator.token.refresh.length > 0,
  );
}
