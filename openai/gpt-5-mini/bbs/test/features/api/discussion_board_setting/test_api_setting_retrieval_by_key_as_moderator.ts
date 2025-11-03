import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

export async function test_api_setting_retrieval_by_key_as_moderator(
  connection: api.IConnection,
) {
  // 1) Moderator signup (creates auth token on connection)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2) Create a setting with a unique key
  const suffix = RandomGenerator.alphaNumeric(6);
  const settingKey = `feature_x_enabled_${suffix}`;
  const createBody = {
    key: settingKey,
    value: "false",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IDiscussionBoardSetting.ICreate;

  const created: IDiscussionBoardSetting =
    await api.functional.discussionBoard.moderator.settings.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3) Retrieve the setting by key as the authenticated moderator
  const retrieved: IDiscussionBoardSetting =
    await api.functional.discussionBoard.moderator.settings.at(connection, {
      settingKey,
    });
  typia.assert(retrieved);

  // Business validations: compare retrieved values against created values
  TestValidator.equals(
    "retrieved setting key matches created key",
    retrieved.key,
    created.key,
  );
  TestValidator.equals(
    "retrieved setting value matches created value",
    retrieved.value,
    created.value,
  );
  TestValidator.equals(
    "retrieved setting is_active matches created is_active",
    retrieved.is_active,
    created.is_active,
  );

  // Check timestamps exist (typia.assert already validated formats)
  TestValidator.predicate(
    "retrieved created_at present",
    typeof retrieved.created_at === "string" && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "retrieved updated_at present",
    typeof retrieved.updated_at === "string" && retrieved.updated_at.length > 0,
  );

  // 4) Authorization negative case: unauthenticated connection should not read the setting
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve moderator setting",
    async () => {
      await api.functional.discussionBoard.moderator.settings.at(unauthConn, {
        settingKey,
      });
    },
  );

  // 5) Not-found negative case: retrieving a missing key should error
  const missingKey = `nonexistent_${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "retrieving a non-existent key should fail",
    async () => {
      await api.functional.discussionBoard.moderator.settings.at(connection, {
        settingKey: missingKey,
      });
    },
  );
}
