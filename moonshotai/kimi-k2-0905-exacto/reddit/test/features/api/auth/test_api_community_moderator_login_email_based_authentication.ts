import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator login using email as the primary authentication
 * identifier.
 *
 * This test validates that the system correctly uses email address as the
 * username for community moderator authentication while maintaining security
 * standards. It ensures that email-based authentication aligns with
 * registration flow and provides consistent user experience for community
 * moderation access.
 *
 * The test follows this workflow:
 *
 * 1. Create a new community moderator account using email-based registration
 * 2. Attempt login with the same email address and password
 * 3. Verify successful authentication and token generation
 * 4. Validate that the authenticated user data matches the registration data
 * 5. Test error handling with incorrect credentials (using valid type structure)
 */
export async function test_api_community_moderator_login_email_based_authentication(
  connection: api.IConnection,
) {
  // Step 1: Generate test data for community moderator registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorNickname = RandomGenerator.name();
  const testUrl = "https://example.com/community/login";
  const testReferrer = "https://example.com/community/join";

  // Step 2: Create community moderator account for email authentication test
  const moderatorAccount: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: testUrl,
        referrer: testReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Step 3: Validate successful registration by checking response data
  TestValidator.equals(
    "registration email matches request",
    moderatorAccount.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "registration nickname matches request",
    moderatorAccount.nickname,
    moderatorNickname,
  );
  typia.assert(moderatorAccount.token);

  // Step 4: Test login with email-based authentication
  const loginResult: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: testUrl,
        referrer: testReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    });
  typia.assert(loginResult);

  // Step 5: Validate successful authentication and token generation
  TestValidator.equals(
    "login email matches registration",
    loginResult.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "login nickname matches registration",
    loginResult.nickname,
    moderatorNickname,
  );
  TestValidator.equals(
    "login user ID matches registration",
    loginResult.id,
    moderatorAccount.id,
  );
  TestValidator.predicate(
    "login returns valid authorization token",
    loginResult.token.access.length > 0,
  );
  typia.assert(loginResult.token);

  // Step 6: Test error handling with incorrect email (valid type structure)
  const wrongEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login should fail with incorrect email",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: wrongEmail,
          password: moderatorPassword,
          href: testUrl,
          referrer: testReferrer,
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Step 7: Test error handling with incorrect password (valid type structure)
  const wrongPassword = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: moderatorEmail,
          password: wrongPassword,
          href: testUrl,
          referrer: testReferrer,
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Step 8: Validate consistent token format and expiration
  typia.assert<IAuthorizationToken>(loginResult.token);
  TestValidator.predicate(
    "token has access property",
    typeof loginResult.token.access === "string",
  );
  TestValidator.predicate(
    "token has refresh property",
    typeof loginResult.token.refresh === "string",
  );
  TestValidator.predicate(
    "token has expiration date",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable date",
    loginResult.token.refreshable_until.length > 0,
  );
}
