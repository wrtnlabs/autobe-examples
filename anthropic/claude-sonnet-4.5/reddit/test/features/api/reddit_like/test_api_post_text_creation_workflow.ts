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
 * Test the complete workflow for creating a text post in a community.
 *
 * This test validates the end-to-end process of text post creation including:
 *
 * 1. Member account creation and authentication
 * 2. Community creation for hosting the post
 * 3. Member subscription to the community
 * 4. Text post creation with valid content
 * 5. Validation of post properties and associations
 */
export async function test_api_post_text_creation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Verify member authentication was successful
  TestValidator.equals(
    "member username matches",
    member.username,
    memberUsername,
  );
  TestValidator.equals("member email matches", member.email, memberEmail);
  TestValidator.predicate("member has valid ID", member.id.length > 0);

  // Step 2: Create a public community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Validate community creation
  TestValidator.equals("community code matches", community.code, communityCode);
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community privacy is public",
    community.privacy_type,
    "public",
  );
  TestValidator.predicate("text posts are allowed", community.allow_text_posts);

  // Step 3: Subscribe member to the community
  const subscription =
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
  TestValidator.predicate(
    "subscription has valid ID",
    subscription.id.length > 0,
  );

  // Step 4: Create a text post with valid title and body
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: postTitle,
      body: postBody,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Validate post creation
  TestValidator.equals("post type is text", post.type, "text");
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.predicate("post has valid ID", post.id.length > 0);
  TestValidator.predicate(
    "post has creation timestamp",
    post.created_at.length > 0,
  );
  TestValidator.predicate(
    "post has update timestamp",
    post.updated_at.length > 0,
  );
}
