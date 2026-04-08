import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_comments_replies_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_comments_replies_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_listing_deleted_parent_preserves_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create parent comment
  const parentComment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentComment);
  // Store original timestamps for validation
  const originalCreatedAt = parentComment.createdAt;
  const originalUpdatedAt = parentComment.updatedAt;
  const originalVoteScore = parentComment.voteScore;
  // 6. Create nested replies under the parent comment
  const reply1 =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        params: {
          commentId: parentComment.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(reply1);
  const reply2 =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        params: {
          commentId: parentComment.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(reply2);
  // 7. Soft-delete the parent comment
  await api.functional.redditClone.member.redditClone.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );
  // 8. List comments to verify deleted parent preserves replies
  const commentsResponse =
    await api.functional.redditClone.redditClone.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "Best" as "Best",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(commentsResponse);
  // 9. Validations
  // Find the deleted parent comment in the response
  const deletedComment = commentsResponse.data.find(
    (comment) => comment.id === parentComment.id,
  );
  // Validation 1: Deleted parent comment is included in response (preserved tree structure)
  TestValidator.predicate(
    "deleted parent comment exists in response",
    deletedComment !== undefined,
  );
  // Validation 6: Vote score is preserved after delete
  TestValidator.equals(
    "vote score preserved after delete",
    deletedComment?.voteScore ?? 0,
    originalVoteScore,
  );
  // Validation 7: Author is preserved
  TestValidator.equals(
    "author id preserved",
    deletedComment?.author.id,
    member.id,
  );
  // Validation 8: createdAt timestamp is preserved (updatedAt not available on ISummary response type)
  TestValidator.equals(
    "createdAt timestamp preserved",
    deletedComment?.createdAt,
    originalCreatedAt,
  );
  if (deletedComment) {
    // Validation 2: Deleted comment's content is null or shows placeholder
    TestValidator.predicate(
      "deleted comment content is null or placeholder",
      deletedComment.content === null || deletedComment.content === "[deleted]",
    );
    // Validation 3: Deleted comment's replies array is still populated
    TestValidator.predicate(
      "deleted parent has replies preserved",
      deletedComment.replies !== undefined && deletedComment.replies.length > 0,
    );
    // Validation 4: Nested replies are fully visible and accessible
    TestValidator.equals(
      "replies count matches",
      deletedComment.replies.length,
      2,
    );
    // Validation 5: Reply IDs match our created replies
    const replyIds = deletedComment.replies.map((r) => r.id);
    TestValidator.predicate(
      "first reply exists under deleted parent",
      replyIds.includes(reply1.id),
    );
    TestValidator.predicate(
      "second reply exists under deleted parent",
      replyIds.includes(reply2.id),
    );
  }
}