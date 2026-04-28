import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test public retrieval of text post content via the GET endpoint.
 *
 * A member creates a text post in a community, then the public GET endpoint retrieves it by postId. Validates the complete text post structure including type-specific fields and engagement metrics.
 *
 * Special attention is given to ensuring text posts have null values for link-specific (url) and image-specific (postImage) fields, while the body field correctly stores the provided text content. Default engagement metrics should show zero votes and zero comments for a newly created post.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Member creates a new community and subscribes to it.
 * 3. Member creates a text post with title and body content.
 * 4. Public GET endpoint retrieves the post by postId without authentication.
 * 5. Validates post_type equals 'text', body contains provided text content.
 * 6. Validates url is null, postImage is null (not applicable for text posts).
 * 7. Validates author summary includes id, username, email, and created_at.
 * 8. Validates community summary includes id, name, description, icon_uri, creator, and subscriber_count.
 * 9. Validates vote_score is 0 and comment_count is 0 for newly created post.
 */
export async function test_api_post_retrieve_text_post_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registers and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "1234",
    },
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post with specific content
  const bodyText = RandomGenerator.paragraph({ sentences: 5 });
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text",
        community_id: community.id,
        title: postTitle,
        body: bodyText,
      },
    },
  );
  typia.assert(post);
  // 5. Public GET endpoint retrieves the post by postId
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditLikeCommunity.posts.at(
    publicConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 6. Validate post type
  TestValidator.equals("post type is text", retrievedPost.post_type, "text");
  // 7. Validate body content matches input
  TestValidator.equals(
    "body contains text content",
    retrievedPost.body,
    bodyText,
  );
  // 8. Validate url is null for text post
  TestValidator.equals("url is null for text post", retrievedPost.url, null);
  // 9. Validate postImage is null for text post
  TestValidator.equals(
    "postImage is null for text post",
    retrievedPost.postImage,
    null,
  );
  // 10. Validate author summary
  TestValidator.equals(
    "author id exists",
    retrievedPost.author.id.length > 0,
    true,
  );
  // 11. Validate community matches
  TestValidator.equals(
    "community id matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  // 12. Validate engagement metrics are zero
  TestValidator.equals("vote_score is 0", retrievedPost.vote_score, 0);
  TestValidator.equals("comment_count is 0", retrievedPost.comment_count, 0);
}
