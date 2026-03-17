import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_sorted_threaded_view_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for content creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create moderator connection for viewing
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // Create community as member
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  // Subscribe to community as member
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // Create post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } as IRedditLikePost.ICreate },
  );
  // Create top-level comment to serve as parent for replies
  const parentComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Parent comment for threading test",
          parentId: null,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  // Create multiple replies to the parent comment
  const reply1 = await generate_random_reddit_like_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: "First reply",
        parentId: parentComment.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  const reply2 = await generate_random_reddit_like_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: "Second reply",
        parentId: parentComment.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  const reply3 = await generate_random_reddit_like_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: "Third reply",
        parentId: parentComment.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  // Create additional top-level comments (not replies) to test exclusion
  const otherTopLevel =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Other top-level comment",
          parentId: null,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  // Call moderated endpoint filtered by parentId
  const response =
    await api.functional.redditLike.moderator.posts.comments.sorted.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          sort: "NEW",
          page: 1,
          limit: 20,
          search: null,
          authorId: null,
          parentId: parentComment.id,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(response);
  // Validate only replies to parent are returned
  const returnedIds = response.data.map((c) => c.id);
  const replyIds = [reply1.id, reply2.id, reply3.id];
  // All replies should be present
  TestValidator.predicate(
    "all replies are included in results",
    replyIds.every((id) => returnedIds.includes(id)),
  );
  // Parent comment (top-level) should NOT be present
  TestValidator.predicate(
    "parent comment is excluded",
    !returnedIds.includes(parentComment.id),
  );
  // Other top-level comments should NOT be present
  TestValidator.predicate(
    "other top-level comments are excluded",
    !returnedIds.includes(otherTopLevel.id),
  );
  // All returned comments should have parent_id matching the filtered parent
  response.data.forEach((comment) => {
    TestValidator.equals(
      `comment ${comment.id} has correct parent_id`,
      comment.parent_id,
      parentComment.id,
    );
  });
  // Pagination should reflect correct count
  TestValidator.equals(
    "pagination records count is 3",
    response.pagination.records,
    3,
  );
}