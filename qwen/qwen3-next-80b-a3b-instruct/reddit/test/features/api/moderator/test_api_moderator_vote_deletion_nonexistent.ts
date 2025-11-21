import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_vote_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: typia.random<ICommunityBBSModerator.ICreate>(),
  });
  typia.assert(moderator);

  // Step 2: Delete vote on non-existent post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return error when deleting vote on non-existent post",
    async () => {
      await api.functional.communityBBS.moderator.posts.votes.erase(
        connection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
