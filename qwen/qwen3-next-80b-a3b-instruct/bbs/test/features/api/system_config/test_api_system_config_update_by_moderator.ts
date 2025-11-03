import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfig";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_system_config_update_by_moderator(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123";

  // Step 1: Register new moderator
  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(registeredModerator);

  // Step 2: Login to get authentication token
  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(authenticatedModerator);

  // Step 3: Update system configuration
  const updatedConfig: IDiscussionBoardConfig =
    await api.functional.discussionBoard.moderator.system.config.update(
      connection,
      {
        key: "max_file_size_per_post_mb",
        body: "10",
      },
    );
  typia.assert(updatedConfig);

  // Validate configuration update
  TestValidator.equals(
    "configuration key matches",
    updatedConfig.key,
    "max_file_size_per_post_mb",
  );
  TestValidator.equals(
    "configuration value updated to 10",
    updatedConfig.value,
    "10",
  );
  TestValidator.predicate(
    "configuration was updated",
    new Date(updatedConfig.updated_at) > new Date(updatedConfig.created_at),
  );
}
