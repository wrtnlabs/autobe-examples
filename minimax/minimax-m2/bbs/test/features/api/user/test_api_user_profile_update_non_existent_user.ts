import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_user_profile_update_non_existent_user(
  connection: api.IConnection,
) {
  // Test updating non-existent user with valid UUID format
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to update non-existent user's profile
  await TestValidator.error(
    "non-existent user update should fail",
    async () => {
      await api.functional.econPoliticalDiscussion.users.update(connection, {
        userId: nonExistentUserId,
        body: {
          display_name: "Test User",
          bio: "This user does not exist",
          status: "active",
        } satisfies IEconPoliticalDiscussionUser.IUpdate,
      });
    },
  );
}
