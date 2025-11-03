import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

export async function test_api_settings_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create a moderator account and obtain authorization
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorBody = {
    username: `mod_${RandomGenerator.alphaNumeric(8)}`,
    email: moderatorEmail,
    // Ensure password length >= 12 and includes diverse character classes
    password: `Aa1!${RandomGenerator.alphaNumeric(9)}`,
    href: "http://example.com/",
    referrer: "http://referrer.example.com/",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // The SDK populates connection.headers.Authorization automatically.
  TestValidator.predicate(
    "moderator token exists",
    typeof moderator.token?.access === "string" &&
      moderator.token.access.length > 0,
  );

  // 2) Create a new runtime setting with a unique key
  const settingKey = `test.setting.delete.${typia.random<string & tags.Format<"uuid">>()}`;
  const createBody = {
    key: settingKey,
    value: "true",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IDiscussionBoardSetting.ICreate;

  const setting: IDiscussionBoardSetting =
    await api.functional.discussionBoard.moderator.settings.create(connection, {
      body: createBody,
    });
  typia.assert(setting);

  TestValidator.equals(
    "created setting key matches requested key",
    setting.key,
    settingKey,
  );
  TestValidator.predicate(
    "created setting is active",
    setting.is_active === true,
  );

  // 3) Perform soft-delete (erase) for the created key
  await api.functional.discussionBoard.moderator.settings.erase(connection, {
    settingKey,
  });
  // If no exception is thrown, deletion is considered successful
  TestValidator.predicate("first erase call succeeded without throwing", true);

  // 4) Repeating the erase should fail (server-side guard for already-deleted)
  await TestValidator.error(
    "re-deleting the same key should fail",
    async () => {
      await api.functional.discussionBoard.moderator.settings.erase(
        connection,
        {
          settingKey,
        },
      );
    },
  );
}
