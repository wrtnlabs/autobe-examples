import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";

/**
 * Test guest registration with minimal required username field. Validates
 * system accepts minimal guest registration without user_agent field,
 * confirming optional field behavior. Verifies successful session creation and
 * proper default handling for missing optional fields.
 */
export async function test_api_guest_join_minimal_required_data(
  connection: api.IConnection,
) {
  // Generate a random username for the guest registration
  const username = RandomGenerator.name();

  // Create guest registration request with minimal data (only required username)
  const requestBody = {
    username,
  } satisfies IEconomicDiscussionGuest.ICreate;

  // Call the guest join API with minimal required data
  const guestAuth: IEconomicDiscussionGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Validate the response using typia for complete type safety
  typia.assert(guestAuth);

  // Verify that the guest has the correct username
  TestValidator.equals(
    "guest username matches input",
    guestAuth.username,
    username,
  );

  // Verify default values for guest session counters
  TestValidator.equals(
    "articles viewed count is zero",
    guestAuth.articles_viewed_count,
    0,
  );
  TestValidator.equals("downloads count is zero", guestAuth.downloads_count, 0);

  // Verify that created_at and last_activity_at are the same (new session)
  TestValidator.equals(
    "activity timestamps match for new session",
    guestAuth.created_at,
    guestAuth.last_activity_at,
  );
}
