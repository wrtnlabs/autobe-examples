import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommentSnapshot";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentSnapshot";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_edit_history_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Setup: Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Setup: Subscribe to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // 4. Setup: Create post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(5),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Setup: Create comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Execution: Retrieve comment edit history snapshots (public endpoint)
  const snapshots = await api.functional.redditLike.comments.snapshots.index(
    connection,
    {
      commentId: comment.id,
      body: {},
    },
  );
  typia.assert(snapshots);
  // 7. Validation: Pagination metadata structure
  TestValidator.equals(
    "pagination current is valid",
    typeof snapshots.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is valid",
    typeof snapshots.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is valid",
    typeof snapshots.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is valid",
    typeof snapshots.pagination.pages,
    "number",
  );
  // 8. Validation: Data array exists
  TestValidator.predicate("data is array", () => Array.isArray(snapshots.data));
  // 9. Validation: If snapshots exist, verify structure and content
  // Note: Cannot create multiple edits (no update API available), validating retrieval only
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    typia.assert(firstSnapshot);
    // Verify the snapshot belongs to our comment
    TestValidator.equals(
      "snapshot commentId matches requested comment",
      firstSnapshot.commentId,
      comment.id,
    );
    // Verify body content exists (either string from edit or original comment)
    TestValidator.predicate(
      "snapshot has body content",
      () => firstSnapshot.body.length > 0,
    );
  }
  // 10. Validation: Pagination consistency
  // If on first page and total records <= limit, data length should match records
  if (
    snapshots.pagination.current === 1 &&
    snapshots.pagination.records <= snapshots.pagination.limit
  ) {
    TestValidator.equals(
      "data length matches total records on single page",
      snapshots.data.length,
      snapshots.pagination.records,
    );
  }
}
