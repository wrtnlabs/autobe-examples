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
 * Test comment edit history snapshot retrieval with pagination and validation.
 *
 * Validates the complete workflow of retrieving comment snapshots that capture edit history. Tests that snapshots are returned with proper pagination metadata, correct sorting order (most recent first), and complete data structure including nested author information.
 *
 * The test authenticates a member, creates a post and comment, then retrieves the comment's snapshot history. It validates that the response structure matches IPageIRedditCloneCommentSnapshot.ISummary with proper pagination fields and snapshot data arrays.
 *
 * 1. Authenticate member using authorize_member_join utility
 * 2. Create a post using generate_random_reddit_clone_member_posts_create utility
 * 3. Create a comment on the post using generate_random_reddit_clone_member_posts_comments_create utility
 * 4. Retrieve comment snapshots using api.functional.redditClone.posts.comments.snapshots.index
 * 5. Validate response structure, pagination metadata, and snapshot data integrity
 */
export async function test_api_comment_snapshots_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(comment);
  // 4. Retrieve comment snapshots
  const snapshotsResponse =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
          sort: "snapshot_created_at_desc",
        } satisfies IRedditCloneCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 6. Validate snapshot data structure
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(snapshotsResponse.data),
  );
  // 7. Validate each snapshot if data exists
  await ArrayUtil.asyncForEach(snapshotsResponse.data, async (snapshot) => {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has content",
      snapshot.content.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid author",
      snapshot.author !== null,
    );
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot has updated_at timestamp",
      snapshot.updated_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot has snapshot_created_at timestamp",
      snapshot.snapshot_created_at.length > 0,
    );
  });
  // 8. Validate snapshots are sorted by snapshot_created_at descending
  if (snapshotsResponse.data.length > 1) {
    TestValidator.predicate(
      "snapshots are sorted by snapshot_created_at descending",
      snapshotsResponse.data.every((snapshot, index, array) => {
        if (index === 0) return true;
        return (
          new Date(snapshot.snapshot_created_at).getTime() <=
          new Date(array[index - 1].snapshot_created_at).getTime()
        );
      }),
    );
  }
}
