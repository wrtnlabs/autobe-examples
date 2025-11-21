import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAdmin";

export async function test_api_admin_vote_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Authenticate admin user for authorization
  const admin: ICommunityBBSAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<ICommunityBBSAdmin.ICreate>(),
    });
  typia.assert(admin);

  // Generate a non-existent post ID using a valid UUID format
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete vote on non-existent post - should return 404 error
  await TestValidator.error(
    "deleting vote on non-existent post should fail with 404",
    async () => {
      await api.functional.communityBBS.admin.posts.votes.erase(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
