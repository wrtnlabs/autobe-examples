import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserKarma";

export async function test_api_user_karma_nonexistent_user(
  connection: api.IConnection,
) {
  // Generate a random UUID that is guaranteed not to exist in the system
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve karma for non-existent user and validate error handling
  await TestValidator.error(
    "should throw error for non-existent user",
    async () => {
      return await api.functional.users.karma.at(connection, {
        userId: nonExistentUserId,
      });
    },
  );
}
