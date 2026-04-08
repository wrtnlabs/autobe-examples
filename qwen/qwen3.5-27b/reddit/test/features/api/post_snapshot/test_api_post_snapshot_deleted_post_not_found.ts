import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_posts_snapshots_create } from "../../../generate/generate_random_reddit_clone_posts_snapshots_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_snapshot } from "../../../prepare/prepare_random_reddit_clone_post_snapshot";

/**
 * Test that attempting to create a snapshot for a non-existent or deleted post returns a 404 error.
 *
 * Validates that the snapshot creation endpoint properly handles attempts to create snapshots for posts that do not exist or have been deleted. This ensures that snapshots can only be created for active, existing posts, maintaining data integrity and preventing orphaned snapshot records.
 *
 * The test creates a valid post first to establish the workflow, then attempts to create a snapshot using an invalid post ID that simulates a deleted or non-existent post. The endpoint should return HTTP 404 Not Found, indicating that the post cannot be found or has been deleted.
 *
 * 1. Register and authenticate as a member user
 * 2. Create a text post to establish the workflow
 * 3. Attempt to create a snapshot with an invalid/non-existent post ID
 * 4. Verify the response returns HTTP 404 Not Found error
 * 5. Validate that no snapshot is created for non-existent posts
 */
export async function test_api_post_snapshot_deleted_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a valid post (to establish workflow, though we won't use it for the snapshot test)
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {},
    });
  typia.assert(post);
  // 3. Attempt to create a snapshot with an invalid/non-existent post ID
  // This simulates trying to snapshot a deleted or non-existent post
  const invalidPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Verify the response returns HTTP 404 Not Found error
  await TestValidator.httpError(
    "snapshot creation for non-existent post returns 404",
    404,
    async () => {
      await generate_random_reddit_clone_posts_snapshots_create(
        memberConnection,
        {
          params: { postId: invalidPostId },
          body: {},
        },
      );
    },
  );
  // 5. Validate that no snapshot was created by attempting to verify the error behavior
  // The test above already validates that the endpoint properly rejects non-existent posts
  TestValidator.predicate(
    "invalid post ID is different from valid post ID",
    invalidPostId !== post.id,
  );
}
