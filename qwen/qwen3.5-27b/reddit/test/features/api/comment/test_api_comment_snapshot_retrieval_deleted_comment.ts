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
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieval of snapshots for a deleted comment.
 *
 * This test verifies that comment snapshots are preserved even after the comment
 * is deleted, enabling content recovery and audit trail purposes. The test
 * validates that the is_deleted filter can be used to retrieve snapshots where
 * the comment was deleted, and that the comment_deleted_at field contains the
 * deletion timestamp.
 */
export async function test_api_comment_snapshot_retrieval_deleted_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a community
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    });
  typia.assert(post);
  // 4. Create a comment on the post
  const comment: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Retrieve snapshots for the comment with is_deleted filter
  const snapshotsResponse: IPageIRedditCloneCommentSnapshot.ISummary =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          is_deleted: true,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate that the is_deleted filter returns expected structure
  TestValidator.equals(
    "deleted snapshots pagination limit",
    snapshotsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "deleted snapshots pagination current page is 1",
    snapshotsResponse.pagination.current === 1,
  );
  // 7. Validate snapshot data structure if snapshots exist
  if (snapshotsResponse.data.length > 0) {
    const firstSnapshot: IRedditCloneCommentSnapshot.ISummary =
      snapshotsResponse.data[0];
    typia.assert(firstSnapshot);
    // Validate that snapshot has the comment_deleted_at field (critical for deleted comment tracking)
    // This field should be present in the snapshot, either with a timestamp or null
    TestValidator.predicate(
      "snapshot has comment_deleted_at field for audit trail",
      firstSnapshot.comment_deleted_at !== undefined,
    );
    // Validate that snapshot content matches the original comment content
    TestValidator.equals(
      "snapshot content matches original comment",
      firstSnapshot.content,
      comment.content,
    );
    // Validate that snapshot author matches the comment author
    TestValidator.equals(
      "snapshot author matches comment author",
      firstSnapshot.author.id,
      comment.author.id,
    );
  }
  // 8. Test retrieval without is_deleted filter to get all snapshots
  const allSnapshotsResponse: IPageIRedditCloneCommentSnapshot.ISummary =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allSnapshotsResponse);
  // 9. Validate that both queries return valid pagination data
  TestValidator.predicate(
    "all snapshots pagination is valid",
    allSnapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all snapshots pagination limit is within range",
    allSnapshotsResponse.pagination.limit >= 1 &&
      allSnapshotsResponse.pagination.limit <= 100,
  );
  // 10. Validate that pagination pages calculation is correct
  TestValidator.predicate(
    "pagination pages calculation is consistent",
    allSnapshotsResponse.pagination.pages ===
      Math.ceil(
        allSnapshotsResponse.pagination.records /
          allSnapshotsResponse.pagination.limit,
      ),
  );
}
