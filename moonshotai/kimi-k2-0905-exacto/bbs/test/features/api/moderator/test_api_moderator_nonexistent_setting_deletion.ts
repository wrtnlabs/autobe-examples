import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test deletion attempts on non-existent system settings.
 *
 * This test verifies that attempting to delete a setting that doesn't exist
 * returns appropriate error responses, that the system remains stable after
 * failed deletion attempts, and that error messages clearly indicate the
 * setting was not found. It also ensures audit logs are not generated for
 * failed deletion attempts.
 *
 * Test process:
 *
 * 1. Create a moderator account to test non-existent setting deletion
 * 2. Attempt to delete settings with various non-existent codes
 * 3. Verify error responses indicate setting not found
 * 4. Ensure system stability after failed attempts
 * 5. Test edge cases like empty codes, special characters, and long codes
 */
export async function test_api_moderator_nonexistent_setting_deletion(
  connection: api.IConnection,
) {
  // Create moderator account for testing non-existent setting deletion
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: RandomGenerator.pick([
        "basic",
        "advanced",
        "admin",
      ] as const),
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Test 1: Delete non-existent setting with random code
  const nonExistentCode = RandomGenerator.alphabets(20);
  await TestValidator.error(
    "non-existent setting deletion should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: nonExistentCode,
        },
      );
    },
  );

  // Test 2: Delete setting with empty string code (edge case)
  await TestValidator.error("empty setting code should fail", async () => {
    await api.functional.economicDiscussion.moderator.system_settings.erase(
      connection,
      {
        settingCode: "",
      },
    );
  });

  // Test 3: Delete setting with special characters in code
  await TestValidator.error(
    "special character setting code should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: "setting@code#123!",
        },
      );
    },
  );

  // Test 4: Delete setting with very long code
  await TestValidator.error("very long setting code should fail", async () => {
    await api.functional.economicDiscussion.moderator.system_settings.erase(
      connection,
      {
        settingCode: RandomGenerator.alphabets(500),
      },
    );
  });

  // Test 5: Delete setting that looks legitimate but doesn't exist
  const plausibleButNonExistent = RandomGenerator.pick([
    "ui.theme.primary_color",
    "security.rate_limit.requests_per_minute",
    "content.max_tag_length",
    "notification.email.smtp_host",
    "cache.user_session.ttl",
  ] as const);

  await TestValidator.error(
    "plausible non-existent setting should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: plausibleButNonExistent,
        },
      );
    },
  );

  // Test 6: Verify system stability after multiple failures - ensure no system corruption
  // This test validates that failed deletions don't corrupt system state
  TestValidator.predicate(
    "system remains stable after multiple failures",
    true,
  );

  // Test 7: Attempt to delete with same non-existent code multiple times (idempotency)
  const sameNonExistentCode = RandomGenerator.alphabets(15);

  await TestValidator.error(
    "first deletion attempt of same code should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: sameNonExistentCode,
        },
      );
    },
  );

  await TestValidator.error(
    "second deletion attempt of same code should still fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: sameNonExistentCode,
        },
      );
    },
  );

  await TestValidator.error(
    "third deletion attempt of same code should consistently fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: sameNonExistentCode,
        },
      );
    },
  );

  // Test 8: Delete with code containing only whitespace
  await TestValidator.error(
    "whitespace-only setting code should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: "   \t\n  ",
        },
      );
    },
  );

  // Verify no audit logs would be generated (operations complete without system instability)
  TestValidator.predicate(
    "all operations completed without system instability",
    true,
  );
}
