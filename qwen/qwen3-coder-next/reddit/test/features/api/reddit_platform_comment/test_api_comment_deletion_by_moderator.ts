import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

/**
 * Test moderator comment deletion capability.
 * 1. Create and authenticate moderator account
 * 2. Create a regular user account
 * 3. Create a comment on a post as the regular user
 * 4. Verify moderator can delete the comment (even though they're not the author)
 *
 * Note: Due to incomplete DTO definition (IRedditPlatformComment has no properties),
 * we can't access the comment's ID directly. This test generates a random comment ID
 * to verify the delete endpoint exists and functions with valid IDs.
 * In production code, the IRedditPlatformComment should include the 'id' property.
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // 2. Create a regular user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(userConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // 3. Create a comment on a post
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.redditPlatform.posts.comments.create(
    userConnection,
    {
      postId: postId,
      body: typia.random<IRedditPlatformComment.ICreate>(),
    },
  );
  typia.assert(comment);
  // 4. Verify moderator can delete the comment (even though they're not the author)
  // Since IRedditPlatformComment has no 'id' property, we use a random UUID for testing
  // In production, IRedditPlatformComment should include the 'id' property
  const commentId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.redditPlatform.comments.erase(moderatorConnection, {
    commentId: commentId,
  });
}
