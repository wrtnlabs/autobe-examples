import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test successful moderator registration with valid credentials
 *
 * This test validates the complete moderator registration workflow by creating
 * a new moderator account with valid credentials. The test ensures that the
 * system properly handles the registration request and returns complete
 * moderator authentication data including access tokens, user profile
 * information, and authorization configurations necessary for administrative
 * access to the economic discussion platform.
 *
 * 1. Generate valid moderator registration data with proper constraints
 * 2. Submit registration request to the moderation system
 * 3. Validate successful account creation response
 * 4. Verify response contains complete authentication information
 * 5. Confirm authorization token is properly set in connection headers
 * 6. Validate all returned moderator metadata for administrative access
 */
export async function test_api_moderator_join_success(
  connection: api.IConnection,
) {
  // Generate valid moderator registration data with proper constraints
  const username = RandomGenerator.name(1); // Realistic username
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32); // Realistic password hash length
  const moderationLevels = ["junior", "intermediate", "senior"] as const;
  const moderationLevel = RandomGenerator.pick(moderationLevels);

  // Prepare complete moderator registration request
  const requestBody = {
    username: username.slice(0, 50) satisfies string & tags.MaxLength<50>, // Ensure max length constraint
    email: email,
    password_hash: passwordHash,
    email_verified: false, // Default to unverified on registration
    two_factor_enabled: false, // Default security setting
    moderation_level: moderationLevel,
  } satisfies IEconomicDiscussionModerator.ICreate;

  // Submit registration request and validate response
  const response: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: requestBody,
    });

  // Validate successful account creation response
  typia.assert(response); // Complete type validation of response

  // Verify response contains complete authentication information
  TestValidator.equals(
    "username matches request",
    response.username,
    requestBody.username,
  );
  TestValidator.equals(
    "email matches request",
    response.email,
    requestBody.email,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/.test(response.id),
  );
  TestValidator.predicate(
    "email verification status set",
    response.email_verified === requestBody.email_verified,
  );
  TestValidator.predicate(
    "two-factor status set",
    response.two_factor_enabled === requestBody.two_factor_enabled,
  );
  TestValidator.equals(
    "moderation level matches",
    response.moderation_level,
    requestBody.moderation_level,
  );

  // Validate email format in response
  TestValidator.predicate(
    "email has valid format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      response.email,
    ),
  );

  // Validate authorization token structure
  TestValidator.predicate("has access token", response.token.access.length > 0);
  TestValidator.predicate(
    "has refresh token",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    typeof response.token.expired_at === "string",
  );
  TestValidator.predicate(
    "has refresh expiration timestamp",
    typeof response.token.refreshable_until === "string",
  );

  // Validate timestamp format
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      response.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      response.token.refreshable_until,
    ),
  );

  // Validate creation/update timestamps
  TestValidator.predicate(
    "has creation timestamp",
    typeof response.created_at === "string",
  );
  TestValidator.predicate(
    "has update timestamp",
    typeof response.updated_at === "string",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      response.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      response.updated_at,
    ),
  );

  // Confirm connection headers were automatically updated with auth token
  TestValidator.predicate(
    "connection has authorization header",
    connection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    connection.headers?.Authorization,
    response.token.access,
  );

  // Verify timestamps are reasonable (not in the past and not too far future)
  const now = new Date().getTime();
  const createdTime = new Date(response.created_at).getTime();
  const updatedTime = new Date(response.updated_at).getTime();
  const accessTokenExpiration = new Date(response.token.expired_at).getTime();

  TestValidator.predicate(
    "created_at is current or recent",
    createdTime >= now - 5000,
  ); // Should be no more than 5 seconds in the past
  TestValidator.predicate(
    "created_at is not future",
    createdTime <= now + 1000,
  ); // Should be no more than 1 second in the future
  TestValidator.predicate(
    "updated_at matches created_at or is later",
    updatedTime >= createdTime,
  );
  TestValidator.predicate(
    "access token expires in the future",
    accessTokenExpiration > now,
  );
}
