import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test retrieval of text-type posts with body content.
 *
 * This test validates the complete workflow of creating and retrieving text
 * posts in a community platform. It verifies that text posts properly store and
 * return body content, maintain correct post_type classification, and ensure
 * url/image_url remain null for text-only posts.
 *
 * Workflow:
 *
 * 1. Moderator account creation and authentication
 * 2. Community creation by moderator
 * 3. Member account creation and authentication
 * 4. Text post creation with title and body
 * 5. Post retrieval and validation
 */
export async function test_api_post_retrieval_text_post(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 4 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Member creates a text post with body content
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 10,
  });

  const createdPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "text",
        body: postBody,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(createdPost);

  // Step 5: Retrieve the post and validate all fields
  const retrievedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(retrievedPost);

  // Validate post_type is 'text'
  TestValidator.equals(
    "post type should be text",
    retrievedPost.post_type,
    "text",
  );

  // Validate body field is populated with the content
  TestValidator.equals(
    "post body should match created content",
    retrievedPost.body,
    postBody,
  );

  // Validate url is null for text posts
  TestValidator.equals(
    "url should be null for text post",
    retrievedPost.url,
    null,
  );

  // Validate image_url is null for text posts
  TestValidator.equals(
    "image_url should be null for text post",
    retrievedPost.image_url,
    null,
  );

  // Validate metadata fields
  TestValidator.equals(
    "post title should match",
    retrievedPost.title,
    postTitle,
  );

  TestValidator.equals(
    "community_id should match",
    retrievedPost.community_id,
    community.id,
  );

  TestValidator.equals(
    "member_id should match",
    retrievedPost.member_id,
    member.id,
  );

  TestValidator.equals(
    "edited flag should be false for new post",
    retrievedPost.edited,
    false,
  );

  // Validate created_at exists and is valid
  TestValidator.predicate(
    "created_at should be a valid date-time",
    retrievedPost.created_at.length > 0,
  );

  // Validate post IDs match
  TestValidator.equals(
    "retrieved post ID should match created post ID",
    retrievedPost.id,
    createdPost.id,
  );
}
