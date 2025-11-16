import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test enabling and disabling two-factor authentication for moderator accounts.
 *
 * This comprehensive test validates the security configuration management
 * capabilities of moderator accounts by testing the complete two-factor
 * authentication lifecycle.
 *
 * The test creates a new moderator account and systematically tests:
 *
 * - Initial account creation with proper validation
 * - Enabling two-factor authentication security setting
 * - Disabling two-factor authentication security setting
 * - Concurrent updates to multiple moderator profile fields
 * - Verification that all security changes are properly reflected
 *
 * This ensures that moderator accounts can dynamically adjust their security
 * settings while maintaining proper access control and administrative
 * capabilities.
 */
export async function test_api_moderator_update_two_factor_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const createdModerator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password_hash: moderatorPassword,
        email_verified: true,
        two_factor_enabled: false,
        moderation_level: "standard",
      } satisfies IEconomicDiscussionModerator.ICreate,
    });

  // Validate the created moderator account
  typia.assert(createdModerator);
  TestValidator.predicate(
    "moderator created successfully",
    createdModerator.id !== null,
  );
  TestValidator.equals(
    "initial two-factor disabled",
    createdModerator.two_factor_enabled,
    false,
  );
  TestValidator.equals(
    "email matches input",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "username matches input",
    createdModerator.username,
    moderatorUsername,
  );

  // Step 2: Enable two-factor authentication
  const enable2FAData = {
    two_factor_enabled: true,
    email_verified: true,
  } satisfies IEconomicDiscussionModerator.IUpdate;

  const moderatorWith2FA: IEconomicDiscussionModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: createdModerator.id,
        body: enable2FAData,
      },
    );

  // Validate 2FA is enabled
  typia.assert(moderatorWith2FA);
  TestValidator.equals(
    "two-factor enabled after update",
    moderatorWith2FA.two_factor_enabled,
    true,
  );
  TestValidator.equals(
    "email verified remains true",
    moderatorWith2FA.email_verified,
    true,
  );
  TestValidator.equals(
    "id remains consistent",
    moderatorWith2FA.id,
    createdModerator.id,
  );

  // Step 3: Disable two-factor authentication
  const disable2FAData = {
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.IUpdate;

  const moderatorWithout2FA: IEconomicDiscussionModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: createdModerator.id,
        body: disable2FAData,
      },
    );

  // Validate 2FA is disabled
  typia.assert(moderatorWithout2FA);
  TestValidator.equals(
    "two-factor disabled after update",
    moderatorWithout2FA.two_factor_enabled,
    false,
  );
  TestValidator.equals(
    "id remains consistent after disable",
    moderatorWithout2FA.id,
    createdModerator.id,
  );

  // Step 4: Test combined updates with two-factor authentication
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = RandomGenerator.alphaNumeric(10);
  const newModerationLevel = "senior";

  const combinedUpdateData = {
    username: newUsername,
    email: newEmail,
    two_factor_enabled: true,
    moderation_level: newModerationLevel,
  } satisfies IEconomicDiscussionModerator.IUpdate;

  const moderatorWithCombinedUpdate: IEconomicDiscussionModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: createdModerator.id,
        body: combinedUpdateData,
      },
    );

  // Validate combined updates
  typia.assert(moderatorWithCombinedUpdate);
  TestValidator.equals(
    "username updated",
    moderatorWithCombinedUpdate.username,
    newUsername,
  );
  TestValidator.equals(
    "email updated",
    moderatorWithCombinedUpdate.email,
    newEmail,
  );
  TestValidator.equals(
    "two-factor enabled in combined update",
    moderatorWithCombinedUpdate.two_factor_enabled,
    true,
  );
  TestValidator.equals(
    "moderation level updated",
    moderatorWithCombinedUpdate.moderation_level,
    newModerationLevel,
  );

  // Step 5: Test disabling two-factor with partial updates
  const partialDisableData = {
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.IUpdate;

  const moderatorPartiallyUpdated: IEconomicDiscussionModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: createdModerator.id,
        body: partialDisableData,
      },
    );

  // Validate partial update
  typia.assert(moderatorPartiallyUpdated);
  TestValidator.equals(
    "two-factor disabled in partial update",
    moderatorPartiallyUpdated.two_factor_enabled,
    false,
  );
  TestValidator.equals(
    "username preserved from previous update",
    moderatorPartiallyUpdated.username,
    newUsername,
  );
  TestValidator.equals(
    "email preserved from previous update",
    moderatorPartiallyUpdated.email,
    newEmail,
  );
  TestValidator.equals(
    "moderation level preserved from previous update",
    moderatorPartiallyUpdated.moderation_level,
    newModerationLevel,
  );
}
