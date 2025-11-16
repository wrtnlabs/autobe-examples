import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test complete moderator account registration with all required fields.
 *
 * This test validates the full moderator registration workflow by submitting a
 * registration request with valid email, password, nickname, connection URL
 * (href), and referrer URL. It verifies that the system successfully creates a
 * new moderator account, returns the complete moderator profile including
 * unique ID, username, email, nickname, and creation timestamp, and issues both
 * access and refresh JWT tokens for immediate authenticated session
 * establishment.
 *
 * The test ensures that:
 *
 * 1. All required registration fields are properly accepted
 * 2. A moderator account is created with complete profile information
 * 3. JWT authentication tokens (access and refresh) are generated
 * 4. Token expiration timestamps are included in the response
 * 5. The newly registered moderator can immediately begin authenticated operations
 *
 * Business flow:
 *
 * - Generate valid registration data (email, password, nickname, URLs)
 * - Submit registration request to POST /auth/moderator/join
 * - Validate successful account creation response
 * - Verify complete moderator profile data
 * - Confirm JWT tokens are properly issued
 */
export async function test_api_moderator_registration_with_complete_profile(
  connection: api.IConnection,
) {
  // Generate valid registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}`,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  // Submit registration request
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Validate response structure and types - typia.assert handles ALL type validation
  typia.assert(moderator);

  // Verify business logic: email matches registration input
  TestValidator.equals(
    "moderator email matches registration email",
    moderator.email,
    registrationData.email,
  );

  // Verify business logic: nickname matches registration input
  TestValidator.equals(
    "moderator nickname matches registration nickname",
    moderator.nickname,
    registrationData.nickname,
  );
}
