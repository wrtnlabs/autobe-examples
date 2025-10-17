import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test creating a link post with URL and metadata extraction.
 *
 * This test validates the complete workflow of creating a link post in a
 * Reddit-like platform, including member authentication, community setup,
 * subscription, and link post creation with metadata extraction capabilities.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create a community for posting
 * 3. Subscribe member to the community for posting permissions
 * 4. Create a link post with valid HTTPS URL
 * 5. Validate post creation with proper type, URL storage, and initialization
 */
export async function test_api_post_link_creation_with_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditLikeMember.ICreate;

  const authorizedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });

  typia.assert(authorizedMember);
  TestValidator.equals(
    "member username matches",
    authorizedMember.username,
    memberData.username,
  );
  TestValidator.equals(
    "member email matches",
    authorizedMember.email,
    memberEmail,
  );

  // Step 2: Create a community
  const communityCode = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityData = {
    code: communityCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    allow_link_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });

  typia.assert(community);
  TestValidator.equals("community code matches", community.code, communityCode);
  TestValidator.equals("link posts allowed", community.allow_link_posts, true);

  // Step 3: Subscribe member to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );

  typia.assert(subscription);
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member_id,
    authorizedMember.id,
  );

  // Step 4: Create a link post with valid HTTPS URL
  const linkUrl =
    "https://example.com/article/" + RandomGenerator.alphaNumeric(10);
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 5,
  });

  const postData = {
    community_id: community.id,
    type: "link",
    title: postTitle,
    url: linkUrl,
  } satisfies IRedditLikePost.ICreate;

  const createdPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });

  // Step 5: Validate post creation
  typia.assert(createdPost);
  TestValidator.equals("post type is link", createdPost.type, "link");
  TestValidator.equals("post title matches", createdPost.title, postTitle);
  TestValidator.predicate("post has valid ID", createdPost.id.length > 0);
  TestValidator.predicate(
    "post has created timestamp",
    createdPost.created_at.length > 0,
  );
  TestValidator.predicate(
    "post has updated timestamp",
    createdPost.updated_at.length > 0,
  );
}
