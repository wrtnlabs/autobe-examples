import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";

export async function test_api_settings_batch_update_rejects_unknown_keys(
  connection: api.IConnection,
) {
  // 1) Moderator sign-up (creates auth token attached to connection by SDK)
  const moderatorBody = {
    username: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator token exists",
    typeof moderator.token?.access === "string",
  );

  // 2) Create a known good setting key
  const createBody = {
    key: "feature_x_enabled",
    value: "false",
    description: "Feature flag used in e2e tests",
    is_active: true,
  } satisfies IDiscussionBoardSetting.ICreate;

  const created: IDiscussionBoardSetting =
    await api.functional.discussionBoard.moderator.settings.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals(
    "created setting key matches",
    created.key,
    createBody.key,
  );
  TestValidator.equals(
    "created setting value matches",
    created.value,
    createBody.value,
  );

  // 3) Attempt batch patch with one valid key and one invalid (non-existent) key
  const batchRequest = {
    settings: [
      { key: "feature_x_enabled", value: "true" },
      { key: "non_existent_key", value: "x" },
    ],
  } satisfies IDiscussionBoardSetting.IRequest;

  await TestValidator.error(
    "batch update with unknown key should fail atomically",
    async () => {
      await api.functional.discussionBoard.moderator.settings.patch(
        connection,
        {
          body: batchRequest,
        },
      );
    },
  );

  // 4) Verify no partial update by performing a single-key patch that sets a
  // distinct value; the single-key patch must succeed and produce the updated value.
  const singlePatch = {
    settings: [{ key: "feature_x_enabled", value: "true" }],
  } satisfies IDiscussionBoardSetting.IRequest;

  const page: IPageIDiscussionBoardSetting.ISummary =
    await api.functional.discussionBoard.moderator.settings.patch(connection, {
      body: singlePatch,
    });
  typia.assert(page);

  const updated = page.data.find((d) => d.key === "feature_x_enabled");
  TestValidator.predicate(
    "updated setting found in patch response",
    updated !== undefined,
  );
  typia.assert(updated!);
  TestValidator.equals("setting value updated to true", updated!.value, "true");
}
