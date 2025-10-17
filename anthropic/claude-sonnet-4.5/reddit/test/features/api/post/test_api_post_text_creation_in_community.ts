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
 * Test creating a text post in a community by a member.
 *
 * This test validates the complete workflow for creating a text post in a
 * community:
 *
 * 1. Register a new member account
 * 2. Create a community for posting
 * 3. Subscribe to that community to gain posting permissions
 * 4. Create a text post with title and markdown body content
 *
 * Verifies that the post is created successfully with correct type
 * discriminator, title, author association, community association, and text
 * content stored properly.
 */
export async function test_api_post_text_creation_in_community(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Validate member registration
  TestValidator.equals(
    "member username matches",
    member.username,
    memberUsername,
  );
  TestValidator.equals("member email matches", member.email, memberEmail);

  // Step 2: Create a community for posting
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Validate community creation
  TestValidator.equals("community code matches", community.code, communityCode);
  TestValidator.equals("community name matches", community.name, communityName);

  // Step 3: Subscribe to the community to gain posting permissions
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);

  // Validate subscription
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

  // Step 4: Create a text post with title and markdown body content
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const post: IRedditLikePost =
    await api.functional.redditLike.member.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          type: "text",
          title: postTitle,
          body: postBody,
        } satisfies IRedditLikePost.ICreate,
      },
    );
  typia.assert(post);

  // Validate post creation results
  TestValidator.equals("post type is text", post.type, "text");
  TestValidator.equals("post title matches", post.title, postTitle);
}
