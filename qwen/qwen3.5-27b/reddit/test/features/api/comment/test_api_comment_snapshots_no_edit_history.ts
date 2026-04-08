import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommentSnapshot";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the edge case where a comment has never been edited and therefore has no snapshots.
 *
 * Validates that when requesting edit history snapshots for a comment that was never modified, the system returns an empty data array with proper pagination metadata (records=0, pages=0). This ensures the API handles the common scenario of new or unedited comments gracefully without throwing errors.
 *
 * 1. Authenticate as a member to create posts and comments.
 * 2. Create a post that will contain the comment.
 * 3. Create a comment that will NOT be edited, resulting in zero snapshots.
 * 4. Request snapshots for the unedited comment.
 * 5. Validate that response has empty data array and pagination shows records=0, pages=0.
 */
export async function test_api_comment_snapshots_no_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Create a comment on the post (without editing it)
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(comment);
  // 4. Request snapshots for the unedited comment
  const snapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 5. Validate empty snapshots response
  TestValidator.equals("data array is empty", snapshots.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", snapshots.pagination.pages, 0);
}
