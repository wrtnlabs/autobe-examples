import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

export async function test_api_settings_create_by_moderator(
  connection: api.IConnection,
) {
  /**
   * Scenario:
   *
   * 1. Register a new moderator via POST /auth/moderator/join (self-join)
   * 2. Create a unique runtime configuration setting via POST
   *    /discussionBoard/moderator/settings
   * 3. Assert persisted properties and timestamps (created_at, updated_at)
   * 4. Attempt duplicate creation of same key and assert it fails
   * 5. Attempt create without authorization and assert it fails
   */

  // 1) Moderator self-join (registration)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1)
    .replace(/\s+/g, "_")
    .toLowerCase();
  const moderatorBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // connection.headers is automatically updated by join() (Authorization token)

  // 2) Create a unique setting
  const suffix = RandomGenerator.alphaNumeric(8);
  const uniqueKey = `feature_x_enabled_${suffix}`;
  const createBody = {
    key: uniqueKey,
    value: "true",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    is_active: true,
  } satisfies IDiscussionBoardSetting.ICreate;

  const setting: IDiscussionBoardSetting =
    await api.functional.discussionBoard.moderator.settings.create(connection, {
      body: createBody,
    });
  typia.assert(setting);

  // Business validations
  TestValidator.equals(
    "created setting key matches input",
    setting.key,
    uniqueKey,
  );
  TestValidator.equals(
    "created setting value matches input",
    setting.value,
    "true",
  );
  TestValidator.predicate(
    "created setting is_active is true",
    setting.is_active === true,
  );

  // Validate timestamps and ordering
  const createdAt = new Date(setting.created_at).getTime();
  const updatedAt = new Date(setting.updated_at).getTime();
  TestValidator.predicate(
    "created_at is ISO and in the past/present",
    createdAt > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO and in the past/present",
    updatedAt > 0,
  );
  TestValidator.predicate("updated_at >= created_at", updatedAt >= createdAt);

  // 3) Duplicate key creation should fail (uniqueness enforcement)
  await TestValidator.error("creating duplicate key should fail", async () => {
    await api.functional.discussionBoard.moderator.settings.create(connection, {
      body: createBody,
    });
  });

  // 4) Unauthorized creation should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthBody = {
    key: `${uniqueKey}_unauth_${RandomGenerator.alphaNumeric(6)}`,
    value: "true",
    description: "Attempt without auth",
    is_active: true,
  } satisfies IDiscussionBoardSetting.ICreate;

  await TestValidator.error(
    "unauthenticated user cannot create setting",
    async () => {
      await api.functional.discussionBoard.moderator.settings.create(
        unauthConn,
        {
          body: unauthBody,
        },
      );
    },
  );
}
