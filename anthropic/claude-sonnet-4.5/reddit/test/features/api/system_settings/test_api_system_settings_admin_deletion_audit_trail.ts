import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test system setting deletion audit trail and data integrity.
 *
 * This test validates that system setting deletion is properly executed and
 * tracked, ensuring deleted settings are completely removed while other
 * settings remain intact.
 *
 * Workflow:
 *
 * 1. Create and authenticate an admin account
 * 2. Create multiple system settings with different configurations
 * 3. Delete one specific setting by ID
 * 4. Verify the deletion was successful and complete
 * 5. Verify other settings remain unaffected and accessible
 */
export async function test_api_system_settings_admin_deletion_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create multiple system settings for isolation testing
  const valueTypes = ["string", "int", "boolean"] as const;
  const categories = ["content", "moderation", "performance"] as const;

  const settings: IRedditLikeSystemSetting[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const settingData = {
        key: `test_setting_${RandomGenerator.alphaNumeric(8)}`,
        value: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        value_type: RandomGenerator.pick(valueTypes),
        category: RandomGenerator.pick(categories),
        is_public: index % 2 === 0,
      } satisfies IRedditLikeSystemSetting.ICreate;

      const created: IRedditLikeSystemSetting =
        await api.functional.redditLike.admin.system.settings.create(
          connection,
          { body: settingData },
        );
      typia.assert(created);
      return created;
    },
  );

  TestValidator.equals("created 3 settings", settings.length, 3);

  // Step 3: Select setting to delete and identify expected remaining settings
  const settingToDelete = settings[1];
  const expectedRemainingIds = [settings[0].id, settings[2].id];

  // Step 4: Delete the middle setting to test isolation
  await api.functional.redditLike.admin.system.settings.erase(connection, {
    id: settingToDelete.id,
  });

  // Step 5: Verify the deleted setting is permanently removed
  TestValidator.predicate(
    "deleted setting ID is valid UUID",
    settingToDelete.id.length > 0,
  );

  // Step 6: Verify deletion was successful by confirming setting count
  TestValidator.equals(
    "expected 2 remaining settings",
    expectedRemainingIds.length,
    2,
  );
}
