import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Validates that an administrator can create a new platform-wide system
 * setting.
 *
 * This test exercises the admin registration flow, system setting creation with
 * various fields, and business/database constraints. Steps:
 *
 * 1. Register a new admin (unique email, strong password, correct URLs for
 *    href/referrer)
 * 2. Use returned JWT to attempt creation of a new system setting with unique
 *    key/value and optional description
 * 3. Validate the new setting is returned as configured
 * 4. Attempt to create a setting with duplicate key (should fail - uniqueness
 *    enforced)
 * 5. Attempt creation with forbidden/blank/illogical values (should fail)
 * 6. Attempt to create a system setting as unauthenticated client (should fail)
 */
export async function test_api_system_setting_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword satisfies string as string,
    href: "https://admin-portal.example.com/register", // Valid URI
    referrer: "https://admin-portal.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Create a unique system setting as the authenticated admin
  const uniqueKey = "platform_setting_" + RandomGenerator.alphaNumeric(8);
  const uniqueVal = "platform-value-" + RandomGenerator.alphaNumeric(8);
  const description = RandomGenerator.paragraph({ sentences: 4 });
  const createBody = {
    key: uniqueKey,
    value: uniqueVal,
    description: description,
  } satisfies IDiscussionBoardSystemSetting.ICreate;
  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.admin.systemSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "system setting key matches",
    createdSetting.key,
    uniqueKey,
  );
  TestValidator.equals(
    "system setting value matches",
    createdSetting.value,
    uniqueVal,
  );
  TestValidator.equals(
    "system setting description matches",
    createdSetting.description,
    description,
  );
  TestValidator.predicate(
    "system setting id is non-empty",
    typeof createdSetting.id === "string" && createdSetting.id.length > 0,
  );

  // 3. Attempt to create another setting with the same key: should fail (uniqueness validation)
  await TestValidator.error(
    "duplicate system setting key should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.systemSettings.create(
        connection,
        {
          body: {
            key: uniqueKey,
            value: "some-other-value",
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSystemSetting.ICreate,
        },
      );
    },
  );

  // 4. Attempt to create a setting with blank/invalid key/value (should fail)
  await TestValidator.error(
    "blank system setting key should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.systemSettings.create(
        connection,
        {
          body: {
            key: "",
            value: "invalid-value",
          } satisfies IDiscussionBoardSystemSetting.ICreate,
        },
      );
    },
  );
  await TestValidator.error("blank value should be rejected", async () => {
    await api.functional.discussionBoard.admin.systemSettings.create(
      connection,
      {
        body: {
          key: "setting_invalid_value_test_" + RandomGenerator.alphaNumeric(5),
          value: "",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  });

  // 5. Attempt to create system setting as unauthenticated client (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated client cannot create system setting",
    async () => {
      await api.functional.discussionBoard.admin.systemSettings.create(
        unauthConn,
        {
          body: {
            key: "unauth_attempt_" + RandomGenerator.alphaNumeric(5),
            value: "x",
          } satisfies IDiscussionBoardSystemSetting.ICreate,
        },
      );
    },
  );
}
