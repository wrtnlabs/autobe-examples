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
 * Test creating a text post with maximum body content length.
 *
 * This test validates that the Reddit Community platform correctly handles text
 * posts with body content approaching the maximum allowed length of 40,000
 * characters as defined in the Prisma schema. It ensures that long-form content
 * is properly accepted, stored, and retrieved without truncation.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a community as the moderator
 * 3. Create and authenticate a member account
 * 4. Create a text post with body content close to 40,000 characters
 * 5. Retrieve the post and verify the full content is preserved
 */
export async function test_api_post_creation_body_content_maximum(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(15),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: "member123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 4: Generate maximum length body content (close to 40,000 characters)
  const targetLength = 39950;
  const bodyContent = RandomGenerator.content({
    paragraphs: 100,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 5,
    wordMax: 10,
  });

  // Ensure we're close to the maximum length
  const adjustedBody =
    bodyContent.length > targetLength
      ? bodyContent.substring(0, targetLength)
      : bodyContent +
        RandomGenerator.content({
          paragraphs: 50,
          sentenceMin: 20,
          sentenceMax: 30,
          wordMin: 5,
          wordMax: 10,
        }).substring(0, targetLength - bodyContent.length);

  // Step 5: Create text post with maximum body content
  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: adjustedBody,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Step 6: Validate the created post has the long body content
  TestValidator.predicate(
    "post type should be text",
    createdPost.post_type === "text",
  );

  TestValidator.predicate(
    "post body should exist and not be null",
    createdPost.body !== null && createdPost.body !== undefined,
  );

  // Verify body content length is preserved
  const retrievedBodyLength = (createdPost.body ?? "").length;
  TestValidator.predicate(
    "body content length should be close to maximum (39,000+)",
    retrievedBodyLength >= 39000,
  );

  // Verify exact content match (no truncation)
  TestValidator.equals(
    "body content should match exactly",
    createdPost.body,
    adjustedBody,
  );

  TestValidator.predicate(
    "body content should be within maximum limit of 40,000 characters",
    retrievedBodyLength <= 40000,
  );
}
