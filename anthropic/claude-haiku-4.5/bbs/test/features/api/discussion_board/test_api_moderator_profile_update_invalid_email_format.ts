import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test email format validation for moderator profile updates.
 *
 * Validates that the moderator profile update endpoint properly enforces email
 * format requirements per RFC 5321 standards. A moderator account is created
 * with a valid email address, then multiple attempts are made to update the
 * profile with invalid email formats. The API should reject all invalid formats
 * while preserving the original profile data on each validation failure.
 *
 * Test workflow:
 *
 * 1. Register a new moderator with valid credentials and email
 * 2. Verify the moderator was created successfully with original email
 * 3. Attempt update with email missing @ symbol - expect validation error
 * 4. Verify original profile persists after failed update
 * 5. Attempt update with email missing domain - expect validation error
 * 6. Verify original profile persists after failed update
 * 7. Attempt update with email having invalid special characters - expect
 *    validation error
 * 8. Verify original profile persists after failed update
 * 9. Attempt update with email having spaces - expect validation error
 * 10. Verify original profile persists after failed update
 * 11. Attempt update with email missing local part - expect validation error
 * 12. Verify final profile still matches original after all failed attempts
 */
export async function test_api_moderator_profile_update_invalid_email_format(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator with valid credentials
  const validEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10).substring(0, 50);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: validEmail,
        password: "SecurePass123!",
        username: username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches registration",
    moderator.email,
    validEmail,
  );

  // Step 2: Get initial profile to verify original state
  const initialProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {} satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(initialProfile);
  TestValidator.equals(
    "initial profile email preserved",
    initialProfile.email,
    validEmail,
  );

  // Step 3: Attempt update with email missing @ symbol
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.discussionBoard.moderator.profile.update(
        connection,
        {
          body: {
            email: "invalidemail.com",
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 4: Verify original profile persists
  const profileAfterAttempt1: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {} satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(profileAfterAttempt1);
  TestValidator.equals(
    "profile unchanged after invalid email attempt",
    profileAfterAttempt1.email,
    validEmail,
  );

  // Step 5: Attempt update with email missing domain
  await TestValidator.error("should reject email without domain", async () => {
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: "user@",
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  });

  // Step 6: Verify original profile persists
  const profileAfterAttempt2: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {} satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(profileAfterAttempt2);
  TestValidator.equals(
    "profile unchanged after missing domain attempt",
    profileAfterAttempt2.email,
    validEmail,
  );

  // Step 7: Attempt update with email having invalid special characters
  await TestValidator.error(
    "should reject email with invalid special characters",
    async () => {
      await api.functional.discussionBoard.moderator.profile.update(
        connection,
        {
          body: {
            email: "user<>@example.com",
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 8: Verify original profile persists
  const profileAfterAttempt3: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {} satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(profileAfterAttempt3);
  TestValidator.equals(
    "profile unchanged after invalid special chars attempt",
    profileAfterAttempt3.email,
    validEmail,
  );

  // Step 9: Attempt update with email having spaces
  await TestValidator.error("should reject email with spaces", async () => {
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: "user name@example.com",
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  });

  // Step 10: Verify original profile persists
  const profileAfterAttempt4: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {} satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(profileAfterAttempt4);
  TestValidator.equals(
    "profile unchanged after space in email attempt",
    profileAfterAttempt4.email,
    validEmail,
  );

  // Step 11: Attempt update with email missing local part
  await TestValidator.error(
    "should reject email without local part",
    async () => {
      await api.functional.discussionBoard.moderator.profile.update(
        connection,
        {
          body: {
            email: "@example.com",
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 12: Verify final profile still matches original
  const finalProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {} satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(finalProfile);
  TestValidator.equals(
    "final profile email matches original after all failed attempts",
    finalProfile.email,
    validEmail,
  );
}
