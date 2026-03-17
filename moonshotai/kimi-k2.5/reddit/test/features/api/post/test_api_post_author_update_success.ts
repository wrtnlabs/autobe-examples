import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImage";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_image } from "../../../prepare/prepare_random_reddit_like_post_image";

export async function test_api_post_author_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
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
  // 4. Create initial text post
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        community_id: community.id,
        post_type: "text",
        body: originalBody,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Update the post with new title and body
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedPost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: newTitle,
        body: newBody,
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the update results
  TestValidator.equals("title updated correctly", updatedPost.title, newTitle);
  TestValidator.predicate(
    "body content updated correctly",
    updatedPost.postType === "text" &&
      (updatedPost.content as IRedditLikePostTextContent).body === newBody,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    post.updatedAt,
    updatedPost.updatedAt,
  );
  TestValidator.equals("post id unchanged", updatedPost.id, post.id);
  TestValidator.equals("author unchanged", updatedPost.author.id, member.id);
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
}
