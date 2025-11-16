import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test system setting creation with maximum allowed settingKey length.
 *
 * A moderator creates a setting with a 100-character settingKey at the maximum
 * allowed boundary, testing that the system correctly handles keys at the
 * length limit. This validates that the length validation is properly enforced
 * at the API boundary.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account for authentication
 * 2. Generate a 100-character settingKey at the maximum allowed length
 * 3. Create a system setting with the maximum-length key
 * 4. Validate the response contains all required fields
 * 5. Verify the settingKey is correctly stored at maximum length
 */
export async function test_api_system_settings_creation_max_key_length(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a 100-character settingKey at the maximum allowed length
  const maxLengthKey = RandomGenerator.alphabets(100);
  TestValidator.predicate(
    "settingKey should be exactly 100 characters",
    maxLengthKey.length === 100,
  );

  // Step 3: Create a system setting with the maximum-length key
  const settingValue = RandomGenerator.paragraph({
    sentences: 3,
  });
  const settingDescription = RandomGenerator.paragraph({
    sentences: 2,
  });

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: maxLengthKey,
          settingValue: settingValue,
          settingType: "string",
          description: settingDescription,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  // Step 4: Validate the response contains all required fields
  TestValidator.equals(
    "created setting key matches input",
    createdSetting.settingKey,
    maxLengthKey,
  );
  TestValidator.equals(
    "created setting value matches input",
    createdSetting.settingValue,
    settingValue,
  );
  TestValidator.equals(
    "created setting type is string",
    createdSetting.settingType,
    "string",
  );
  TestValidator.predicate(
    "created setting has UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdSetting.id,
    ),
  );
  TestValidator.predicate(
    "isActive flag is true by default",
    createdSetting.isActive === true,
  );

  // Step 5: Verify the settingKey is correctly stored at maximum length
  TestValidator.predicate(
    "settingKey at maximum length (100 chars) is properly stored",
    createdSetting.settingKey.length === 100,
  );
}
