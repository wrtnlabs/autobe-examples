import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator registration email uniqueness validation
 *
 * Validates that the system properly rejects registration attempts with
 * already-registered email addresses while providing appropriate error
 * messages. Tests that email uniqueness validation prevents account duplication
 * and maintains platform security standards by ensuring each community
 * moderator must have a unique email address as specified in the
 * IRedditCommunityCommunityModerator.ICreate interface requirements.
 */
export async function test_api_community_moderator_registration_email_uniqueness_validation(
  connection: api.IConnection,
) {
  // Generate a unique email that will be used for both registration attempts
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Generate referrer URL for both registration attempts
  const referrerUrl = "https://reddit-community.example.com/register";

  // Generate IP address for both registrations (optional field)
  const ipAddress = typia.random<string & tags.Format<"ipv4">>();

  // First registration attempt - should succeed
  const firstModerator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: testEmail,
        href: referrerUrl,
        ip: ipAddress,
        nickname: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        referrer: referrerUrl,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // Validate the first registration was successful
  typia.assert(firstModerator);

  TestValidator.predicate(
    "first moderator has ID",
    firstModerator.id !== undefined && firstModerator.id !== null,
  );
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    testEmail,
  );
  TestValidator.predicate(
    "first moderator has valid token",
    firstModerator.token.access !== undefined &&
      firstModerator.token.access.length > 0,
  );

  // Second registration attempt with same email - should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          email: testEmail,
          href: referrerUrl,
          ip: ipAddress,
          nickname: RandomGenerator.name(),
          password: RandomGenerator.alphaNumeric(12),
          referrer: referrerUrl,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      });
    },
  );

  // Additional validation: Test with a different email to ensure non-duplicate emails still work
  const differentEmail = typia.random<string & tags.Format<"email">>();

  const thirdModerator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: differentEmail,
        href: referrerUrl,
        ip: ipAddress,
        nickname: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        referrer: referrerUrl,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // Validate the third registration with different email succeeded
  typia.assert(thirdModerator);
  TestValidator.predicate(
    "third moderator has ID",
    thirdModerator.id !== undefined && thirdModerator.id !== null,
  );
  TestValidator.equals(
    "third moderator email matches different email",
    thirdModerator.email,
    differentEmail,
  );
  TestValidator.predicate(
    "third moderator has valid token",
    thirdModerator.token.access !== undefined &&
      thirdModerator.token.access.length > 0,
  );

  // Verify the email uniqueness is maintained (different emails were used)
  TestValidator.notEquals(
    "first and third moderator emails are different",
    firstModerator.email,
    thirdModerator.email,
  );
}
