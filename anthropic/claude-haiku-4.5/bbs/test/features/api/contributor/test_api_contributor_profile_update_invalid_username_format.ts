import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test username format and length validation for contributor profile updates.
 *
 * This test validates that the profile update API correctly enforces username
 * validation rules according to the pattern ^[a-zA-Z0-9_]{3,50}$. The test
 * registers a contributor account, then systematically tests invalid username
 * scenarios including:
 *
 * 1. Too short usernames (< 3 characters) - should fail validation
 * 2. Too long usernames (> 50 characters) - should fail validation
 * 3. Usernames with spaces - should fail validation
 * 4. Usernames with special characters - should fail validation
 *
 * For each invalid update attempt, the test verifies:
 *
 * - The API returns a validation error
 * - The original username remains unchanged after failed update
 * - The user's profile data is not corrupted
 *
 * This ensures data integrity and proper error handling when invalid data is
 * submitted, protecting the system from malformed usernames.
 *
 * Steps:
 *
 * 1. Register a new contributor with valid credentials
 * 2. Attempt update with too-short username (1-2 chars)
 * 3. Verify original username persists
 * 4. Attempt update with too-long username (51+ chars)
 * 5. Verify original username persists
 * 6. Attempt update with username containing spaces
 * 7. Verify original username persists
 * 8. Attempt update with username containing invalid special characters
 * 9. Verify original username persists
 */
export async function test_api_contributor_profile_update_invalid_username_format(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const validUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const registered = await api.functional.auth.contributor.join(connection, {
    body: {
      email: email,
      username: validUsername,
      password: "SecurePassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(registered);

  // Store original username for verification
  const originalUsername = registered.username;
  TestValidator.equals(
    "registered username matches input",
    originalUsername,
    validUsername,
  );

  // Step 2: Attempt update with too-short username (< 3 chars)
  await TestValidator.error(
    "should reject username with less than 3 characters",
    async () => {
      await api.functional.discussionBoard.contributor.profile.update(
        connection,
        {
          body: {
            username: "ab", // Only 2 characters - invalid
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 3: Verify original username persists after failed update
  const checkAfterShort =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          // Empty update to fetch current state without changing data
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(checkAfterShort);
  TestValidator.equals(
    "username unchanged after short username rejection",
    checkAfterShort.username,
    originalUsername,
  );

  // Step 4: Attempt update with too-long username (> 50 chars)
  const longUsername = "a".repeat(51); // 51 characters - exceeds maximum
  await TestValidator.error(
    "should reject username with more than 50 characters",
    async () => {
      await api.functional.discussionBoard.contributor.profile.update(
        connection,
        {
          body: {
            username: longUsername,
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 5: Verify original username persists after long username rejection
  const checkAfterLong =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          // Empty update to fetch current state without changing data
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(checkAfterLong);
  TestValidator.equals(
    "username unchanged after long username rejection",
    checkAfterLong.username,
    originalUsername,
  );

  // Step 6: Attempt update with username containing spaces
  await TestValidator.error("should reject username with spaces", async () => {
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          username: "user name123", // Contains space - invalid
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  });

  // Step 7: Verify original username persists after space rejection
  const checkAfterSpace =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          // Empty update to fetch current state without changing data
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(checkAfterSpace);
  TestValidator.equals(
    "username unchanged after space rejection",
    checkAfterSpace.username,
    originalUsername,
  );

  // Step 8: Attempt update with username containing invalid special characters
  await TestValidator.error(
    "should reject username with special characters",
    async () => {
      await api.functional.discussionBoard.contributor.profile.update(
        connection,
        {
          body: {
            username: "user@name#123", // Contains @ and # - invalid
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 9: Verify original username persists after special char rejection
  const checkAfterSpecialChar =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          // Empty update to fetch current state without changing data
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(checkAfterSpecialChar);
  TestValidator.equals(
    "username unchanged after special character rejection",
    checkAfterSpecialChar.username,
    originalUsername,
  );
}
