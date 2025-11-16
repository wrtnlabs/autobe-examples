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
 * Test creating a text post with title and body content.
 *
 * This test validates the complete workflow for creating a text-type post in a
 * Reddit-style community. It verifies that authenticated members can
 * successfully create text posts with proper validation of required fields,
 * content constraints, and response data integrity.
 *
 * Workflow:
 *
 * 1. Create moderator account to establish the community infrastructure
 * 2. Moderator creates a community to host the text post
 * 3. Create member account to author the post
 * 4. Member authenticates to obtain session token
 * 5. Create text post with valid title, body content, and post_type='text'
 * 6. Validate response contains correct post data with system-generated fields
 * 7. Verify all associations (community_id, member_id) are correct
 * 8. Confirm text-specific fields (body populated, url/image_url null)
 * 9. Validate initialization of metadata (edited=false, timestamps present)
 */
export async function test_api_post_creation_text_type(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates community
  const communityName = RandomGenerator.alphabets(10);
  const communityDisplayTitle = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const communityRules = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: communityDisplayTitle,
          description: communityDescription,
          rules: communityRules,
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphabets(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Member login (authentication context switch)
  const memberAuthorized = await api.functional.auth.member.login(connection, {
    body: {
      username: memberUsername,
      email: undefined,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });
  typia.assert(memberAuthorized);

  // Step 5: Create text post
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

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "text",
        body: postBody,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Step 6: Validate response structure and business logic
  TestValidator.equals(
    "community ID matches",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "member ID matches",
    createdPost.member_id,
    memberAuthorized.id,
  );
  TestValidator.equals("title matches", createdPost.title, postTitle);
  TestValidator.equals("post type is text", createdPost.post_type, "text");
  TestValidator.equals("body content matches", createdPost.body, postBody);
  TestValidator.equals("url is null for text post", createdPost.url, null);
  TestValidator.equals(
    "image_url is null for text post",
    createdPost.image_url,
    null,
  );
  TestValidator.equals("edited flag is false", createdPost.edited, false);
}
