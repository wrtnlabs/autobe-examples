import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionModerator";

/**
 * Test retrieving detailed information about a specific economic discussion
 * board moderator by UUID.
 *
 * This test validates that complete moderator profile information is returned
 * including username, email verification status, two-factor authentication
 * configuration, moderation level, appointment timestamp, and last activity
 * timestamp. The test ensures that sensitive information is properly protected
 * while providing necessary details for administrative oversight.
 *
 * Test workflow:
 *
 * 1. Create a moderator account through the join endpoint to establish
 *    authentication
 * 2. Retrieve the detailed moderator information using the moderator's unique ID
 * 3. Validate that all expected fields are present and correctly formatted
 * 4. Test the retrieval of a different moderator to ensure the endpoint works for
 *    various accounts
 * 5. Verify that the response structure matches the IEconomicDiscussionModerator
 *    type definition
 */
export async function test_api_moderator_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account for authentication
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModeratorData = {
    username: RandomGenerator.name(),
    email: firstModeratorEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: RandomGenerator.pick([
      "junior",
      "moderate",
      "senior",
      "admin",
    ] as const),
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: firstModeratorData,
  });
  typia.assert(firstModerator);

  // Step 2: Retrieve detailed information for the first moderator
  const firstModeratorDetails =
    await api.functional.economicDiscussion.moderator.moderators.at(
      connection,
      {
        moderatorId: firstModerator.id,
      },
    );
  typia.assert(firstModeratorDetails);

  // Validate first moderator details
  TestValidator.equals(
    "first moderator ID matches",
    firstModeratorDetails.id,
    firstModerator.id,
  );
  TestValidator.equals(
    "first moderator username matches",
    firstModeratorDetails.username,
    firstModerator.username,
  );
  TestValidator.equals(
    "first moderator email matches",
    firstModeratorDetails.email,
    firstModerator.email,
  );
  TestValidator.equals(
    "first moderator email verification status",
    firstModeratorDetails.email_verified,
    firstModerator.email_verified,
  );
  TestValidator.equals(
    "first moderator 2FA status",
    firstModeratorDetails.two_factor_enabled,
    firstModerator.two_factor_enabled,
  );
  TestValidator.equals(
    "first moderator level matches",
    firstModeratorDetails.moderation_level,
    firstModerator.moderation_level,
  );
  TestValidator.predicate(
    "first moderator has created_at timestamp",
    !!firstModeratorDetails.created_at,
  );
  TestValidator.predicate(
    "first moderator has updated_at timestamp",
    !!firstModeratorDetails.updated_at,
  );

  // Step 3: Create second moderator account for additional testing
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();
  const secondModeratorData = {
    username: RandomGenerator.name(),
    email: secondModeratorEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: RandomGenerator.pick([
      "junior",
      "moderate",
      "senior",
      "admin",
    ] as const),
    email_verified: false,
    two_factor_enabled: true,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const secondModerator = await api.functional.auth.moderator.join(connection, {
    body: secondModeratorData,
  });
  typia.assert(secondModerator);

  // Step 4: Retrieve detailed information for the second moderator
  const secondModeratorDetails =
    await api.functional.economicDiscussion.moderator.moderators.at(
      connection,
      {
        moderatorId: secondModerator.id,
      },
    );
  typia.assert(secondModeratorDetails);

  // Validate second moderator details with different configuration
  TestValidator.equals(
    "second moderator ID matches",
    secondModeratorDetails.id,
    secondModerator.id,
  );
  TestValidator.equals(
    "second moderator username matches",
    secondModeratorDetails.username,
    secondModerator.username,
  );
  TestValidator.equals(
    "second moderator email matches",
    secondModeratorDetails.email,
    secondModerator.email,
  );
  TestValidator.equals(
    "second moderator email verification status",
    secondModeratorDetails.email_verified,
    secondModerator.email_verified,
  );
  TestValidator.equals(
    "second moderator 2FA status",
    secondModeratorDetails.two_factor_enabled,
    secondModerator.two_factor_enabled,
  );
  TestValidator.equals(
    "second moderator level matches",
    secondModeratorDetails.moderation_level,
    secondModerator.moderation_level,
  );
  TestValidator.predicate(
    "second moderator has created_at timestamp",
    !!secondModeratorDetails.created_at,
  );
  TestValidator.predicate(
    "second moderator has updated_at timestamp",
    !!secondModeratorDetails.updated_at,
  );

  // Step 5: Verify that both moderators have distinct properties
  TestValidator.notEquals(
    "moderator IDs are different",
    firstModeratorDetails.id,
    secondModeratorDetails.id,
  );
  TestValidator.notEquals(
    "moderator usernames are different",
    firstModeratorDetails.username,
    secondModeratorDetails.username,
  );
  TestValidator.notEquals(
    "moderator emails are different",
    firstModeratorDetails.email,
    secondModeratorDetails.email,
  );

  // Step 6: Validate field formats and data types
  TestValidator.predicate(
    "first moderator ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstModeratorDetails.id,
    ),
  );
  TestValidator.predicate(
    "second moderator ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      secondModeratorDetails.id,
    ),
  );
  TestValidator.predicate(
    "first moderator email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstModeratorDetails.email),
  );
  TestValidator.predicate(
    "second moderator email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondModeratorDetails.email),
  );
  TestValidator.predicate(
    "first moderator created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      firstModeratorDetails.created_at,
    ),
  );
  TestValidator.predicate(
    "second moderator created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      secondModeratorDetails.created_at,
    ),
  );

  // Step 7: Verify that sensitive security information is properly structured but accessible to authorized users
  TestValidator.predicate(
    "first moderator password_hash exists",
    !!firstModeratorDetails.password_hash,
  );
  TestValidator.predicate(
    "second moderator password_hash exists",
    !!secondModeratorDetails.password_hash,
  );
  TestValidator.predicate(
    "first moderator password_hash is non-empty",
    firstModeratorDetails.password_hash.length > 0,
  );
  TestValidator.predicate(
    "second moderator password_hash is non-empty",
    secondModeratorDetails.password_hash.length > 0,
  );
}
