import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_creation_with_content_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated registered user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://google.com",
        display_name: "Test Community Creator",
        bio: "Creating test communities for E2E validation",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Test Community with Only Text Posts Allowed
  const textOnlyCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `textonly_${RandomGenerator.alphaNumeric(8)}`,
          title: "Text Only Community",
          description: "A community for text-based discussions only",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: false,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(textOnlyCommunity);
  TestValidator.equals(
    "text posts enabled",
    textOnlyCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts disabled",
    textOnlyCommunity.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "image posts disabled",
    textOnlyCommunity.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "no post approval required",
    textOnlyCommunity.require_post_approval,
    false,
  );
  TestValidator.equals(
    "no comment approval required",
    textOnlyCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "NSFW content disabled",
    textOnlyCommunity.nsfw_content_allowed,
    false,
  );

  // Step 3: Test Community with Link and Image Posts (No Text Posts)
  const mediaOnlyCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `mediaonly_${RandomGenerator.alphaNumeric(8)}`,
          title: "Media Only Community",
          description: "Share links and images, no text posts",
          type: "restricted",
          allow_text_posts: false,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: true,
          require_comment_approval: false,
          nsfw_content_allowed: true,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(mediaOnlyCommunity);
  TestValidator.equals(
    "text posts disabled",
    mediaOnlyCommunity.allow_text_posts,
    false,
  );
  TestValidator.equals(
    "link posts enabled",
    mediaOnlyCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "image posts enabled",
    mediaOnlyCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "post approval required",
    mediaOnlyCommunity.require_post_approval,
    true,
  );
  TestValidator.equals(
    "no comment approval required",
    mediaOnlyCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "NSFW content enabled",
    mediaOnlyCommunity.nsfw_content_allowed,
    true,
  );

  // Step 4: Test Community with All Content Types and Approval Requirements
  const strictCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `strict_${RandomGenerator.alphaNumeric(8)}`,
          title: "Strict Moderation Community",
          description: "All content types allowed but heavily moderated",
          type: "private",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: true,
          require_comment_approval: true,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(strictCommunity);
  TestValidator.equals(
    "all text posts enabled",
    strictCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "all link posts enabled",
    strictCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "all image posts enabled",
    strictCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "post approval required",
    strictCommunity.require_post_approval,
    true,
  );
  TestValidator.equals(
    "comment approval required",
    strictCommunity.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "NSFW content disabled",
    strictCommunity.nsfw_content_allowed,
    false,
  );

  // Step 5: Test Community with Mixed Approval Settings
  const mixedCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `mixed_${RandomGenerator.alphaNumeric(8)}`,
          title: "Mixed Approval Community",
          description: "Posts require approval, comments don't",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: true,
          require_post_approval: true,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(mixedCommunity);
  TestValidator.equals(
    "text posts enabled",
    mixedCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts disabled",
    mixedCommunity.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "image posts enabled",
    mixedCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "post approval required",
    mixedCommunity.require_post_approval,
    true,
  );
  TestValidator.equals(
    "no comment approval required",
    mixedCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "NSFW content disabled",
    mixedCommunity.nsfw_content_allowed,
    false,
  );

  // Step 6: Test Boundary Case - All Permissions Disabled
  const lockedCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `locked_${RandomGenerator.alphaNumeric(8)}`,
          title: "Locked Community",
          description: "Community with all content permissions disabled",
          type: "private",
          allow_text_posts: false,
          allow_link_posts: false,
          allow_image_posts: false,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(lockedCommunity);
  TestValidator.equals(
    "text posts disabled",
    lockedCommunity.allow_text_posts,
    false,
  );
  TestValidator.equals(
    "link posts disabled",
    lockedCommunity.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "image posts disabled",
    lockedCommunity.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "no post approval required",
    lockedCommunity.require_post_approval,
    false,
  );
  TestValidator.equals(
    "no comment approval required",
    lockedCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "NSFW content disabled",
    lockedCommunity.nsfw_content_allowed,
    false,
  );

  // Step 7: Test NSFW Community with All Permissions
  const nsfwCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `nsfw_${RandomGenerator.alphaNumeric(8)}`,
          title: "NSFW Content Community",
          description: "Adult content community with all permissions",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: true,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(nsfwCommunity);
  TestValidator.equals(
    "text posts enabled",
    nsfwCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts enabled",
    nsfwCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "image posts enabled",
    nsfwCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "no post approval required",
    nsfwCommunity.require_post_approval,
    false,
  );
  TestValidator.equals(
    "no comment approval required",
    nsfwCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "NSFW content enabled",
    nsfwCommunity.nsfw_content_allowed,
    true,
  );

  // Step 8: Validate Community Creator Assignment
  TestValidator.equals(
    "creator assigned correctly",
    textOnlyCommunity.creator.id,
    user.id,
  );
  TestValidator.equals(
    "creator username preserved",
    textOnlyCommunity.creator.username,
    user.username,
  );
  TestValidator.equals(
    "member count initialized to zero",
    textOnlyCommunity.member_count,
    0,
  );
  TestValidator.equals(
    "post count initialized to zero",
    textOnlyCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "subscriber count initialized to zero",
    textOnlyCommunity.subscriber_count,
    0,
  );

  // Step 9: Validate Community Status and Type Settings
  TestValidator.equals(
    "public community type set",
    textOnlyCommunity.type,
    "public",
  );
  TestValidator.equals(
    "restricted community type set",
    mediaOnlyCommunity.type,
    "restricted",
  );
  TestValidator.equals(
    "private community type set",
    strictCommunity.type,
    "private",
  );
  TestValidator.equals(
    "community status is active",
    textOnlyCommunity.status,
    "active",
  );
  TestValidator.equals(
    "business status assigned",
    textOnlyCommunity.business_status.length > 0,
    true,
  );

  // Step 10: Validate Unique Community Names
  const communityNames = [
    textOnlyCommunity.name,
    mediaOnlyCommunity.name,
    strictCommunity.name,
    mixedCommunity.name,
    lockedCommunity.name,
    nsfwCommunity.name,
  ];

  // Check all names are unique
  const uniqueNames = new Set(communityNames);
  TestValidator.equals(
    "all community names are unique",
    uniqueNames.size,
    communityNames.length,
  );

  // Step 11: Test Error Scenarios
  await TestValidator.error(
    "should fail with invalid community name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: "invalid name with spaces", // Invalid: contains spaces
            title: "Invalid Name Test",
            description: "Testing invalid name validation",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  await TestValidator.error("should fail with name too short", async () => {
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: "ab", // Invalid: too short (min 2 characters)
          title: "Too Short Name Test",
          description: "Testing minimum name length",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: false,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  });

  // Step 12: Validate Description and Title Limits
  const longDescription = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const longTitle = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const limitsTestCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `limits_${RandomGenerator.alphaNumeric(8)}`,
          title: longTitle.substring(0, 100), // Ensure title is within 100 char limit
          description: longDescription.substring(0, 500), // Ensure description is within 500 char limit
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: false,
          require_post_approval: false,
          require_comment_approval: true,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(limitsTestCommunity);
  TestValidator.equals(
    "title length within limit",
    limitsTestCommunity.title.length <= 100,
    true,
  );
  TestValidator.equals(
    "description length within limit",
    limitsTestCommunity.description?.length ?? 0 <= 500,
    true,
  );
}
