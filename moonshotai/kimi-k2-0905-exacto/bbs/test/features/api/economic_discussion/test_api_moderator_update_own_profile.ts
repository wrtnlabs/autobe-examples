import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test that a moderator can successfully update their own profile information
 * including username, email, two-factor authentication settings, and moderation
 * level. Validates that the update operation works correctly with all available
 * fields and that the response reflects the changes appropriately. This tests
 * the basic self-management functionality for moderator accounts.
 *
 * The test follows this workflow:
 *
 * 1. Create a new moderator account with complete registration data
 * 2. Generate update data with realistic modifications for all available fields
 * 3. Call the update moderator endpoint with the new data
 * 4. Validate that the response shows the correctly updated values
 * 5. Test partial updates with only some fields being modified
 * 6. Verify that timestamps are properly updated on modification
 */
export async function test_api_moderator_update_own_profile(
  connection: api.IConnection,
) {
  // Step 1: Create initial moderator account with complete registration data
  const initialRegistration = {
    username: RandomGenerator.name(1),
    email: "test.moderator" + RandomGenerator.alphabets(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(30),
    email_verified: RandomGenerator.pick([true, false]),
    two_factor_enabled: false,
    moderation_level: "basic" as const,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: initialRegistration,
    },
  );
  typia.assert(createdModerator);

  // Step 2: Generate comprehensive update data with all fields changed
  const fullUpdateData = {
    username: RandomGenerator.name(1),
    email: "updated.moderator" + RandomGenerator.alphabets(5) + "@example.com",
    email_verified: !createdModerator.email_verified,
    two_factor_enabled: !createdModerator.two_factor_enabled,
    moderation_level: RandomGenerator.pick([
      "intermediate",
      "advanced",
      "expert",
    ]),
  } satisfies IEconomicDiscussionModerator.IUpdate;

  // Step 3: Apply the full update to the moderator profile
  const updatedModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: createdModerator.id,
        body: fullUpdateData,
      },
    );
  typia.assert(updatedModerator);

  // Step 4: Validate all fields were updated correctly
  TestValidator.equals(
    "username should be updated",
    updatedModerator.username,
    fullUpdateData.username,
  );
  TestValidator.equals(
    "email should be updated",
    updatedModerator.email,
    fullUpdateData.email,
  );
  TestValidator.equals(
    "email verified should be updated",
    updatedModerator.email_verified,
    fullUpdateData.email_verified,
  );
  TestValidator.equals(
    "two factor should be updated",
    updatedModerator.two_factor_enabled,
    fullUpdateData.two_factor_enabled,
  );
  TestValidator.equals(
    "moderation level should be updated",
    updatedModerator.moderation_level,
    fullUpdateData.moderation_level,
  );
  TestValidator.equals(
    "ID should remain the same",
    updatedModerator.id,
    createdModerator.id,
  );

  // Step 5: Test partial update with only some fields modified
  const partialUpdateData = {
    username: RandomGenerator.name(1),
    email_verified: true,
    two_factor_enabled: true,
  } satisfies IEconomicDiscussionModerator.IUpdate;

  const partiallyUpdatedModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: createdModerator.id,
        body: partialUpdateData,
      },
    );
  typia.assert(partiallyUpdatedModerator);

  // Step 6: Validate partial update results
  TestValidator.equals(
    "username should be updated in partial",
    partiallyUpdatedModerator.username,
    partialUpdateData.username,
  );
  TestValidator.equals(
    "email verified should be updated in partial",
    partiallyUpdatedModerator.email_verified,
    partialUpdateData.email_verified,
  );
  TestValidator.equals(
    "two factor should be updated in partial",
    partiallyUpdatedModerator.two_factor_enabled,
    partialUpdateData.two_factor_enabled,
  );
  TestValidator.equals(
    "other unchanged fields",
    partiallyUpdatedModerator.email,
    updatedModerator.email,
  );
  TestValidator.equals(
    "moderation level unchanged",
    partiallyUpdatedModerator.moderation_level,
    updatedModerator.moderation_level,
  );

  // Step 7: Verify timestamp updates indicate modification occurred
  TestValidator.predicate(
    "updated_at should be modified in full update",
    new Date(updatedModerator.updated_at).getTime() >=
      new Date(createdModerator.updated_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at should be modified in partial update",
    new Date(partiallyUpdatedModerator.updated_at).getTime() >=
      new Date(updatedModerator.updated_at).getTime(),
  );
}
