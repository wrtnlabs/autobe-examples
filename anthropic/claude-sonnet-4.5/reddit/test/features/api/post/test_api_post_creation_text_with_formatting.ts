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
 * Test creating text posts with preserved formatting.
 *
 * This test validates that the Reddit Community platform correctly preserves
 * text formatting including line breaks, paragraphs, special characters, and
 * Unicode content when creating and retrieving text posts. The test ensures
 * that user-intended structure in plain text format remains intact throughout
 * the post creation and retrieval workflow.
 *
 * Test Flow:
 *
 * 1. Create and authenticate moderator account
 * 2. Create a community for testing formatted content
 * 3. Create and authenticate member account
 * 4. Create text post with complex formatting (line breaks, Unicode, special
 *    chars)
 * 5. Retrieve the post and verify exact formatting preservation
 */
export async function test_api_post_creation_text_with_formatting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community for formatted content testing
  const communityName = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for posting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create formatted text post with special content
  const formattedBody = [
    "First paragraph with Unicode: Hello 世界 🌍",
    "",
    "Second paragraph with special chars: @#$%^&*()_+-=[]{}|;':&quot;,./<>?",
    "",
    "Third paragraph with\ttabs and    multiple   spaces",
    "Line breaks\nare\nimportant\ntoo",
    "",
    "Final paragraph with mixed content: café, naïve, résumé",
  ].join("\n");

  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  });

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "text",
        body: formattedBody,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Step 5: Validate post creation and formatting preservation
  TestValidator.equals("post type is text", createdPost.post_type, "text");
  TestValidator.equals("post title preserved", createdPost.title, postTitle);
  TestValidator.equals(
    "post community association",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author identification",
    createdPost.member_id,
    member.id,
  );
  TestValidator.equals("post not edited", createdPost.edited, false);

  // Validate body exists and formatting is preserved
  typia.assertGuard(createdPost.body!);
  const bodyContent = createdPost.body;

  TestValidator.equals(
    "post body formatting preserved",
    bodyContent,
    formattedBody,
  );
  TestValidator.predicate(
    "contains Unicode characters",
    bodyContent.includes("世界"),
  );
  TestValidator.predicate("contains emoji", bodyContent.includes("🌍"));
  TestValidator.predicate(
    "contains special characters",
    bodyContent.includes("@#$%^&*()"),
  );
  TestValidator.predicate(
    "contains accented characters",
    bodyContent.includes("café") && bodyContent.includes("naïve"),
  );
  TestValidator.predicate(
    "preserves line breaks",
    bodyContent.split("\n").length > 5,
  );
}
