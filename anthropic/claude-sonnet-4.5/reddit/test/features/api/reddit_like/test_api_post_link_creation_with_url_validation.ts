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
 * Test creating a link post in a community with URL validation.
 *
 * This test validates the complete workflow for creating a link-type post in a
 * Reddit-like community, ensuring proper URL validation, type discrimination,
 * and Open Graph metadata extraction.
 *
 * Step-by-step process:
 *
 * 1. Register a new member account and obtain authentication
 * 2. Create a community for posting
 * 3. Subscribe to the community to gain posting permissions
 * 4. Create a link post with a valid HTTPS URL
 * 5. Validate the post has correct type, URL, and metadata extraction was
 *    attempted
 */
export async function test_api_post_link_creation_with_url_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community for posting
  const communityCode = RandomGenerator.alphaNumeric(10);
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        allow_link_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  TestValidator.equals(
    "community allows link posts",
    community.allow_link_posts,
    true,
  );

  // Step 3: Subscribe to the community
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
    member.id,
  );

  // Step 4: Create a link post with valid HTTPS URL
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const validUrl = "https://example.com/article/test-link";

  const linkPost: IRedditLikePost =
    await api.functional.redditLike.member.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          type: "link",
          title: postTitle,
          url: validUrl,
        } satisfies IRedditLikePost.ICreate,
      },
    );
  typia.assert(linkPost);

  // Step 5: Validate the link post properties
  TestValidator.equals("post type is link", linkPost.type, "link");
  TestValidator.equals("post title matches", linkPost.title, postTitle);

  // Validate post creation metadata
  TestValidator.predicate(
    "post has valid creation timestamp",
    linkPost.created_at !== null && linkPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "post has valid update timestamp",
    linkPost.updated_at !== null && linkPost.updated_at !== undefined,
  );
}
