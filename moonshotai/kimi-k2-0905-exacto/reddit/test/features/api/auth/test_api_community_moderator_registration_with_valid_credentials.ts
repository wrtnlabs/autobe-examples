import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test successful community moderator registration with valid credentials.
 *
 * This E2E test validates the complete community moderator registration
 * workflow ensuring proper authentication, data validation, and immediate token
 * issuance.
 *
 * Business Context: Community moderators are elevated users with administrative
 * privileges for community management. Registration requires email
 * verification, secure password hashing, and JWT token provision.
 *
 * Test Flow:
 *
 * 1. Generate realistic moderator registration data
 * 2. Submit registration request via API
 * 3. Validate response contains complete authorization profile
 * 4. Confirm token issuance for immediate platform access
 * 5. Verify timestamp formatting and data integrity
 */
export async function test_api_community_moderator_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Generate realistic registration data for community moderator
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    nickname: RandomGenerator.name(),
    href: "https://reddit-community.com/join",
    referrer: "https://reddit-community.com/",
    ip: null,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  // Execute registration with API
  const registeredModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: registrationData,
    });

  // Validate response structure and authentication token
  typia.assert(registeredModerator);

  // Verify profile data integrity
  TestValidator.equals(
    "registration email matches",
    registeredModerator.email,
    registrationData.email,
  );
  TestValidator.equals(
    "registration nickname matches",
    registeredModerator.nickname,
    registrationData.nickname,
  );
  TestValidator.predicate(
    "user UUID is valid",
    typeof registeredModerator.id === "string" &&
      registeredModerator.id.length === 36,
  );

  // Verify timestamp formatting
  TestValidator.predicate(
    "created_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      registeredModerator.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      registeredModerator.updated_at,
    ),
  );

  // Validate authorization tokens
  TestValidator.predicate(
    "access token present",
    registeredModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    registeredModerator.token.refresh.length > 0,
  );

  // Verify token expiration timestamps
  TestValidator.predicate(
    "access token expiration is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      registeredModerator.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refresh token expiration is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      registeredModerator.token.refreshable_until,
    ),
  );

  // Confirm immediate capability for moderation activities
  TestValidator.predicate(
    "profile is complete and authorized",
    registeredModerator.email.length > 0 &&
      registeredModerator.nickname.length > 0 &&
      registeredModerator.id !== undefined,
  );
}
