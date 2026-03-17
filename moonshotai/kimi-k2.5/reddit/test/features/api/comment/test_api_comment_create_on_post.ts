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

export async function test_api_comment_create_on_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: commentContent,
          parentId: null,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Verify business logic expectations
  TestValidator.equals(
    "content matches input",
    comment.content,
    commentContent,
  );
  TestValidator.equals("vote_score is 0", comment.voteScore, 0);
  TestValidator.equals("is_edited is false", comment.isEdited, false);
  TestValidator.equals("is_deleted is false", comment.isDeleted, false);
  TestValidator.equals(
    "parentId is null for top-level comment",
    comment.parentId,
    null,
  );
  TestValidator.equals("replies array is empty", comment.replies.length, 0);
  // Verify author is correctly populated
  TestValidator.equals(
    "author id matches authenticated member",
    comment.author.id,
    member.id,
  );
  TestValidator.equals(
    "author email matches",
    comment.author.email,
    member.email,
  );
  TestValidator.equals(
    "author username matches",
    comment.author.username,
    member.username,
  );
  // Verify post is correctly populated
  TestValidator.equals(
    "post id matches created post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals("post title matches", comment.post.title, post.title);
  TestValidator.equals(
    "post post_type matches",
    comment.post.post_type,
    post.postType,
  );
}
