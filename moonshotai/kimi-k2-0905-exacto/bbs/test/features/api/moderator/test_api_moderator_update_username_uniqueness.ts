import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_moderator_update_username_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account with a specific username
  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: "moderator_alpha",
      email: "alpha@discussion.economic",
      password_hash: "securehash123",
      moderation_level: "moderator",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(firstModerator);

  // Step 2: Create second moderator account with a different username
  const secondModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: "moderator_beta",
      email: "beta@discussion.economic",
      password_hash: "securehash456",
      moderation_level: "moderator",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(secondModerator);

  // Step 3: Attempt to update second moderator's username to match first moderator's
  await TestValidator.error(
    "username uniqueness validation should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.update(
        connection,
        {
          moderatorId: secondModerator.id,
          body: {
            username: firstModerator.username,
          } satisfies IEconomicDiscussionModerator.IUpdate,
        },
      );
    },
  );
}
