import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test retrieving an existing text post with complete details.
 *
 * Scenario:
 * 1. Member authenticates
 * 2. Creates a community
 * 3. Subscribes to the community
 * 4. Creates a text post
 * 5. Retrieves the post by ID
 * 6. Validates all expected fields
 */
export async function test_api_post_retrieval_text_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // 2. Create a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {},
      },
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
  // 4. Create a text post
  const postBody: IRedditLikePost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    community_id: community.id,
    post_type: "text",
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 10, wordMax: 20 }),
    excerpt: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;
  const createdPost: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: postBody as DeepPartial<IRedditLikePost.ICreate>,
    });
  typia.assert(createdPost);
  // 5. Retrieve the post by ID (public endpoint - can use base connection)
  const retrievedPost = await api.functional.redditLike.posts.at(connection, {
    postId: createdPost.id,
  });
  typia.assert(retrievedPost);
  // 6. Validate business logic - verify retrieved data matches what was created
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals(
    "title matches created",
    retrievedPost.title,
    createdPost.title,
  );
  TestValidator.equals("postType is text", retrievedPost.postType, "text");
  TestValidator.equals(
    "author ID matches member",
    retrievedPost.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    member.username,
  );
  TestValidator.equals(
    "author email matches",
    retrievedPost.author.email,
    member.email,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.equals("voteScore is 0", retrievedPost.voteScore, 0);
  TestValidator.equals("commentCount is 0", retrievedPost.commentCount, 0);
  // Validate text content matches what was created
  const textContent = retrievedPost.content as IRedditLikePostTextContent;
  TestValidator.equals("content body matches", textContent.body, postBody.body);
  TestValidator.equals(
    "content excerpt matches",
    textContent.excerpt,
    postBody.excerpt,
  );
}
