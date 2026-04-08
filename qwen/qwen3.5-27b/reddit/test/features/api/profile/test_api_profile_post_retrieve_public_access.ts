import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test public access to retrieve a specific post from a user's profile page.
 *
 * Validates that the profile post retrieval endpoint is accessible to all users including unauthenticated guests. The test creates a complete setup with a member user, community, subscription, and post, then verifies the post can be retrieved publicly with all expected data fields intact.
 *
 * Special attention is given to verifying that the response includes complete post details, author profile information, and community context, while confirming that the endpoint does not require authentication headers.
 *
 * 1. Create a member user account who will author the post.
 * 2. Retrieve an existing community from the platform.
 * 3. Subscribe the member to the community (required to create posts).
 * 4. Create a text post by the member in the community.
 * 5. Retrieve the post using the profile endpoint with correct profileId and postId.
 * 6. Verify the response contains complete post details with initial vote and comment counts.
 * 7. Verify the response includes author profile object with all fields.
 * 8. Verify the response includes community object with all fields.
 * 9. Confirm the endpoint is accessible without authentication (guest access).
 */
export async function test_api_profile_post_retrieve_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user account (author)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Retrieve an existing community from the platform
  const communityConnection: api.IConnection = { host: connection.host };
  const communitiesPage = await api.functional.redditClone.communities.index(
    communityConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(communitiesPage);
  // Use the first available community
  const community = communitiesPage.data[0];
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post by the member in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: community.id,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve the post using the profile endpoint (guest access - no auth)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditClone.profiles.posts.at(
    guestConnection,
    {
      profileId: member.id,
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 6. Verify post details
  TestValidator.equals("title matches", retrievedPost.title, post.title);
  TestValidator.equals("post type is text", retrievedPost.post_type, "text");
  TestValidator.equals(
    "text content matches",
    retrievedPost.text_content,
    post.text_content,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedPost.updated_at !== undefined,
  );
  TestValidator.equals("initial vote score is 0", retrievedPost.vote_score, 0);
  TestValidator.equals(
    "initial comment count is 0",
    retrievedPost.comment_count,
    0,
  );
  // 7. Verify author profile object
  TestValidator.equals("author id matches", retrievedPost.author.id, member.id);
  TestValidator.predicate(
    "author has display_name",
    retrievedPost.author.display_name !== undefined,
  );
  TestValidator.predicate(
    "author has karma",
    typeof retrievedPost.author.karma === "number",
  );
  TestValidator.predicate(
    "author bio is string or null",
    typeof retrievedPost.author.bio === "string" ||
      retrievedPost.author.bio === null,
  );
  TestValidator.predicate(
    "author avatar is string or null",
    typeof retrievedPost.author.avatar === "string" ||
      retrievedPost.author.avatar === null,
  );
  // 8. Verify community object
  TestValidator.equals(
    "community id matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.predicate(
    "community has name",
    retrievedPost.community.name !== undefined,
  );
  TestValidator.predicate(
    "community has description",
    retrievedPost.community.description !== undefined,
  );
  TestValidator.predicate(
    "community has owner",
    retrievedPost.community.owner !== undefined,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof retrievedPost.community.subscriber_count === "number",
  );
  TestValidator.predicate(
    "community icon is string or null",
    typeof retrievedPost.community.icon === "string" ||
      retrievedPost.community.icon === null,
  );
}
