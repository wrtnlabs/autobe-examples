import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test administrator system settings retrieval with category metadata
 * validation.
 *
 * This test validates that administrators can retrieve individual system
 * settings and verify proper category classification. Creates system settings
 * across different categories (content, moderation, performance, features) and
 * confirms each retrieved setting maintains its category metadata correctly.
 *
 * Workflow:
 *
 * 1. Register administrator account with authentication
 * 2. Create system settings in different categories
 * 3. Retrieve each setting individually by ID
 * 4. Validate category metadata is preserved
 * 5. Confirm complete setting structure
 */
export async function test_api_system_setting_retrieval_categorization(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create system settings across different categories
  const categories = [
    "content",
    "moderation",
    "performance",
    "features",
  ] as const;

  const settingsData = categories.map(
    (category) =>
      ({
        key: `${category}_${RandomGenerator.alphaNumeric(8)}`,
        value: RandomGenerator.alphaNumeric(5),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        value_type: "string",
        category: category,
        is_public: RandomGenerator.pick([true, false]),
      }) satisfies IRedditLikeSystemSetting.ICreate,
  );

  const createdSettings = await ArrayUtil.asyncMap(
    settingsData,
    async (data) => {
      const setting =
        await api.functional.redditLike.admin.system.settings.create(
          connection,
          {
            body: data,
          },
        );
      typia.assert(setting);
      return setting;
    },
  );

  // Step 3: Retrieve each setting individually and validate
  await ArrayUtil.asyncForEach(createdSettings, async (createdSetting) => {
    const retrievedSetting =
      await api.functional.redditLike.admin.system.settings.at(connection, {
        id: createdSetting.id,
      });
    typia.assert(retrievedSetting);

    // Step 4: Validate category metadata preservation
    TestValidator.equals(
      "setting ID matches",
      retrievedSetting.id,
      createdSetting.id,
    );

    TestValidator.equals(
      "setting key matches",
      retrievedSetting.key,
      createdSetting.key,
    );

    TestValidator.equals(
      "setting value matches",
      retrievedSetting.value,
      createdSetting.value,
    );

    TestValidator.equals(
      "category metadata preserved",
      retrievedSetting.category,
      createdSetting.category,
    );

    TestValidator.equals(
      "value type preserved",
      retrievedSetting.value_type,
      createdSetting.value_type,
    );

    TestValidator.equals(
      "public visibility flag preserved",
      retrievedSetting.is_public,
      createdSetting.is_public,
    );
  });
}
