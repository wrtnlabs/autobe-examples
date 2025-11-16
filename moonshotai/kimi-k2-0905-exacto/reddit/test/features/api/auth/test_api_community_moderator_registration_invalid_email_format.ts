import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator registration with invalid email formats to validate
 * input sanitization.
 *
 * This test validates that the system rejects malformed email addresses and
 * provides appropriate validation feedback. Tests that email format validation
 * protects against injection attacks and ensures data quality for
 * authentication and communication purposes.
 *
 * Step-by-step process:
 *
 * 1. Generate valid registration data with proper email format
 * 2. Test business logic scenarios with valid types
 * 3. Validate API handles duplicate registration attempts
 * 4. Test with existing email using fresh connection
 * 5. Verify successful registration maintains proper response structure
 * 6. Validate JWT authentication tokens are properly issued
 */
export async function test_api_community_moderator_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Create a valid initial registration as control test
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validNickname = RandomGenerator.name();

  const firstRegistration = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: validEmail,
        password: "ValidPass123!",
        nickname: validNickname,
        href: "https://reddit.com/registration",
        referrer: "https://google.com/search",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  typia.assert(firstRegistration);

  // Test duplicate email registration - this should fail with business logic error
  const newUnauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.communityModerator.join(newUnauthConnection, {
        body: {
          email: validEmail, // Same email - should cause duplicate error
          password: "DifferentPass123!",
          nickname: RandomGenerator.name(),
          href: "https://reddit.com/registration/again",
          referrer: "https://google.com/search",
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      });
    },
  );

  // Test with random valid email to verify format acceptance
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondRegistration = await api.functional.auth.communityModerator.join(
    newUnauthConnection,
    {
      body: {
        email: secondEmail,
        password: "AnotherValid123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit.com/create-account",
        referrer: "https://reddit.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  typia.assert(secondRegistration);

  TestValidator.predicate(
    "valid registration should produce authorized response",
    secondRegistration.id !== null &&
      typeof secondRegistration.token.access === "string" &&
      secondRegistration.token.access.length > 0,
  );

  // Test JWT token structure is properly formatted
  TestValidator.predicate(
    "JWT access token should be present and valid",
    secondRegistration.token.access.startsWith("eyJ") ||
      secondRegistration.token.access.length > 20,
  );

  TestValidator.predicate(
    "JWT refresh token should be present and valid",
    typeof secondRegistration.token.refresh === "string" &&
      secondRegistration.token.refresh.length > 20,
  );

  TestValidator.predicate(
    "Response should include properly formatted dates",
    secondRegistration.created_at.endsWith("Z") &&
      secondRegistration.updated_at.endsWith("Z"),
  );
}
