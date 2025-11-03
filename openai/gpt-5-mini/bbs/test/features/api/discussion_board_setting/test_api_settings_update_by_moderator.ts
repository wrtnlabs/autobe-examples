import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

export async function test_api_settings_update_by_moderator(
  connection: api.IConnection,
) {
  // 1) Register a moderator (SDK will attach token to the connection)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        email: moderatorEmail,
        password: "Complex#Pass1234",
        href: "https://example.local/",
        referrer: "https://referrer.local/",
        display_name: RandomGenerator.name(),
        ip: RandomGenerator.mobile(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2) Create an initial setting to update
  const settingKey = `rate_limit_threshold_test_${RandomGenerator.alphaNumeric(6)}`;
  const createBody = {
    key: settingKey,
    value: "10",
    description: "Initial rate limit for e2e test",
    is_active: true,
  } satisfies IDiscussionBoardSetting.ICreate;

  const created: IDiscussionBoardSetting =
    await api.functional.discussionBoard.moderator.settings.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals("created setting key matches", created.key, settingKey);

  // 3) Authorized update via PUT /.../{settingKey}
  const updateBody = {
    value: "20",
    description: "Updated by e2e test",
    is_active: false,
  } satisfies IDiscussionBoardSetting.IUpdate;

  const updated: IDiscussionBoardSetting =
    await api.functional.discussionBoard.moderator.settings.putBySettingkey(
      connection,
      { settingKey, body: updateBody },
    );
  typia.assert(updated);

  TestValidator.equals("updated value applied", updated.value, "20");
  TestValidator.equals(
    "updated description applied",
    updated.description,
    "Updated by e2e test",
  );
  TestValidator.equals("updated is_active applied", updated.is_active, false);
  TestValidator.predicate(
    "updated_at is newer than created_at",
    Date.parse(updated.updated_at) > Date.parse(created.created_at),
  );

  // 4) Negative: unauthorized update (no moderator credentials)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("authorization required for update", async () => {
    await api.functional.discussionBoard.moderator.settings.putBySettingkey(
      unauthConn,
      {
        settingKey,
        body: { value: "30" } satisfies IDiscussionBoardSetting.IUpdate,
      },
    );
  });

  // 5) Negative: update non-existent key should fail
  const nonExistentKey = `${settingKey}_noexist`;
  await TestValidator.error(
    "updating non-existent key should fail",
    async () => {
      await api.functional.discussionBoard.moderator.settings.putBySettingkey(
        connection,
        {
          settingKey: nonExistentKey,
          body: { value: "1" } satisfies IDiscussionBoardSetting.IUpdate,
        },
      );
    },
  );

  // 6) Concurrency: issue two parallel updates and ensure both complete and return valid responses
  const concurrentBodies = [
    { value: "30" } satisfies IDiscussionBoardSetting.IUpdate,
    { value: "40" } satisfies IDiscussionBoardSetting.IUpdate,
  ];

  const results = await Promise.all(
    concurrentBodies.map((b) =>
      api.functional.discussionBoard.moderator.settings.putBySettingkey(
        connection,
        {
          settingKey,
          body: b,
        },
      ),
    ),
  );

  // Validate both responses and that they are well-formed
  results.forEach((r, i) => {
    typia.assert(r);
    TestValidator.predicate(
      `concurrent result ${i} has matching key`,
      r.key === settingKey,
    );
  });

  TestValidator.predicate("concurrent updates completed", results.length === 2);
}
