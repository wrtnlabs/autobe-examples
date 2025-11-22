import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserKarma";

export async function test_api_user_karma_communities_nonexistent_user(
  connection: api.IConnection,
) {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve karma breakdown for non-existent user
  await TestValidator.error(
    "should return error for non-existent user",
    async () => {
      await api.functional.redditPlatform.users.karma.communities.at(
        connection,
        {
          userId: nonExistentUserId,
        },
      );
    },
  );
}
