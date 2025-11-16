import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate admin-only deletion behavior when targeting a non-existent post.
 *
 * Business objectives:
 *
 * - Ensure that DELETE /communityPlatform/adminUser/posts/{postId} does not
 *   silently succeed when the given postId does not exist.
 * - Confirm that adminUser authentication via POST /auth/adminUser/join is
 *   required even when the post is missing.
 * - Verify that, for an unknown postId, the SDK-level call fails (throws), rather
 *   than returning a normal ICommunityPlatformPost payload.
 *
 * Test steps:
 *
 * 1. Register a new adminUser using the join endpoint with a valid
 *    ICommunityPlatformAdminUserJoin.IRequest payload.
 * 2. Assert that the join response is a valid
 *    ICommunityPlatformAdminuser.IAuthorized instance and that the SDK has
 *    applied the access token to the connection.
 * 3. Generate a random UUID-formatted string that will be used as a fabricated
 *    postId that has never been created during this test.
 * 4. Call api.functional.communityPlatform.adminUser.posts.erase with that
 *    fabricated postId from the authenticated admin context, and assert that
 *    the call results in an error rather than a successful
 *    ICommunityPlatformPost response.
 * 5. Use TestValidator.error with an async callback and proper await to guarantee
 *    that the thrown error is captured and that the test fails if the deletion
 *    unexpectedly succeeds.
 */
export async function test_api_admin_post_deletion_for_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (admin-only actor) via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Fabricate a non-existent postId using a random UUID
  const nonexistentPostId = typia.random<string & tags.Format<"uuid">>();

  // 3-5. Attempt to erase the non-existent post and assert that it fails
  await TestValidator.error(
    "deleting non-existent post must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.erase(connection, {
        postId: nonexistentPostId,
      });
    },
  );
}
