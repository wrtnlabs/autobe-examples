import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
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

/**
 * Verify community moderator can delete another member's comment.
 * Setup: Create two member accounts (author and moderator), create a community,
 * have both subscribe, create a post, have author create a comment.
 * The moderator (not the author) attempts to delete the comment.
 * Expected: Returns 204 No Content as moderator has delete authority in the community.
 */
export async function test_api_comment_deletion_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const author: IRedditLikeMember.IAuthorized = await authorize_member_join(
    authorConnection,
    { body: {} },
  );
  typia.assert(author);
  // Step 2: Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: IRedditLikeMember.IAuthorized = await authorize_member_join(
    moderatorConnection,
    { body: {} },
  );
  typia.assert(moderator);
  // Step 3: Create community (moderator becomes owner with moderation privileges)
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(community);
  TestValidator.notEquals(
    "community owner should be moderator, not author",
    community.owner.id,
    author.id,
  );
  // Step 4: Subscribe author to the community
  const authorSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(authorSubscription);
  // Step 5: Subscribe moderator to the community (as community owner)
  const moderatorSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      moderatorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(moderatorSubscription);
  // Step 6: Create a post using author account
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(authorConnection, {
      body: { community_id: community.id },
    });
  typia.assert(post);
  TestValidator.equals(
    "post author should be author",
    post.author.id,
    author.id,
  );
  TestValidator.equals(
    "post community should match",
    post.community.id,
    community.id,
  );
  // Step 7: Create a comment using author account
  const comment: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      authorConnection,
      {
        body: { content: "Test comment by author" },
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment author should be author",
    comment.author.id,
    author.id,
  );
  TestValidator.equals("comment post should match", comment.postId, post.id);
  // Step 8: Moderator deletes the comment (not the author)
  await api.functional.redditLike.member.posts.comments.erase(
    moderatorConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // Deletion successful - returns 204 No Content
  TestValidator.predicate("comment deleted successfully", true);
}
