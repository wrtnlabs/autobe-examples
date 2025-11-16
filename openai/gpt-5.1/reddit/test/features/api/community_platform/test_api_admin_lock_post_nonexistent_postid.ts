import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_admin_lock_post_nonexistent_postid(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser so that we have admin-level authorization.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate a UUID that we will treat as a non-existent postId.
  const nonexistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare the update body that attempts to lock the post.
  const lockBody = {
    is_locked: true,
  } satisfies ICommunityPlatformPost.IUpdate;

  // 4. Expect a not-found style HTTP error (404) when trying to lock a post
  //    that does not exist.
  await TestValidator.httpError(
    "locking a non-existent post should result in 404 not found",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.posts.lock.update(
        connection,
        {
          postId: nonexistentPostId,
          body: lockBody,
        },
      );
    },
  );
}
