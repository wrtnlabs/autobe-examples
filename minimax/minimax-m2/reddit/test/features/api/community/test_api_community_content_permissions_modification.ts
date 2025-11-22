import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_content_permissions_modification(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account for community management testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "testPassword123!",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community with conservative initial content permissions
  const communityName = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  const initialCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Permissions",
          description:
            "Community created to test content permission modifications",
          type: "public",
          allow_text_posts: true, // Only text posts initially allowed
          allow_link_posts: false, // Links disabled initially
          allow_image_posts: false, // Images disabled initially
          require_post_approval: true, // Posts require approval
          require_comment_approval: true, // Comments require approval
          nsfw_content_allowed: false, // NSFW content disabled
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(initialCommunity);

  // Validate initial state
  TestValidator.equals(
    "community name matches",
    initialCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "text posts initially allowed",
    initialCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts initially disabled",
    initialCommunity.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "image posts initially disabled",
    initialCommunity.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "post approval initially required",
    initialCommunity.require_post_approval,
    true,
  );
  TestValidator.equals(
    "comment approval initially required",
    initialCommunity.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "NSFW content initially disabled",
    initialCommunity.nsfw_content_allowed,
    false,
  );

  // Step 3: Enable link posts and disable post approval requirements
  const updatedCommunity1: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          allow_link_posts: true, // Enable link posts
          require_post_approval: false, // Disable post approval
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity1);

  // Validate first set of changes
  TestValidator.equals(
    "link posts enabled",
    updatedCommunity1.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "text posts still allowed",
    updatedCommunity1.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "image posts still disabled",
    updatedCommunity1.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "post approval disabled",
    updatedCommunity1.require_post_approval,
    false,
  );
  TestValidator.equals(
    "comment approval still required",
    updatedCommunity1.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "NSFW content still disabled",
    updatedCommunity1.nsfw_content_allowed,
    false,
  );

  // Step 4: Enable image posts and comment approval requirements
  const updatedCommunity2: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          allow_image_posts: true, // Enable image posts
          require_comment_approval: false, // Disable comment approval
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity2);

  // Validate second set of changes
  TestValidator.equals(
    "image posts enabled",
    updatedCommunity2.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "text posts still allowed",
    updatedCommunity2.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts still enabled",
    updatedCommunity2.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "post approval still disabled",
    updatedCommunity2.require_post_approval,
    false,
  );
  TestValidator.equals(
    "comment approval disabled",
    updatedCommunity2.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "NSFW content still disabled",
    updatedCommunity2.nsfw_content_allowed,
    false,
  );

  // Step 5: Enable NSFW content policy
  const updatedCommunity3: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          nsfw_content_allowed: true, // Enable NSFW content
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity3);

  // Validate NSFW policy change
  TestValidator.equals(
    "NSFW content enabled",
    updatedCommunity3.nsfw_content_allowed,
    true,
  );
  TestValidator.equals(
    "all post types still allowed",
    updatedCommunity3.allow_text_posts &&
      updatedCommunity3.allow_link_posts &&
      updatedCommunity3.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "no approval requirements",
    !updatedCommunity3.require_post_approval &&
      !updatedCommunity3.require_comment_approval,
    true,
  );

  // Step 6: Test restrictive changes - disable image posts and enable approvals
  const updatedCommunity4: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          allow_image_posts: false, // Disable image posts
          require_post_approval: true, // Re-enable post approval
          require_comment_approval: true, // Re-enable comment approval
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity4);

  // Validate restrictive changes
  TestValidator.equals(
    "image posts disabled again",
    updatedCommunity4.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "text posts still allowed",
    updatedCommunity4.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts still enabled",
    updatedCommunity4.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "post approval re-enabled",
    updatedCommunity4.require_post_approval,
    true,
  );
  TestValidator.equals(
    "comment approval re-enabled",
    updatedCommunity4.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "NSFW content still enabled",
    updatedCommunity4.nsfw_content_allowed,
    true,
  );

  // Step 7: Test simultaneous major changes
  const updatedCommunity5: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          allow_text_posts: false, // Disable text posts
          allow_link_posts: false, // Disable link posts
          allow_image_posts: true, // Enable only image posts
          nsfw_content_allowed: false, // Disable NSFW content
          require_post_approval: false, // No post approval
          require_comment_approval: false, // No comment approval
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity5);

  // Validate major restructuring
  TestValidator.equals(
    "text posts disabled",
    updatedCommunity5.allow_text_posts,
    false,
  );
  TestValidator.equals(
    "link posts disabled",
    updatedCommunity5.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "only image posts allowed",
    updatedCommunity5.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "NSFW content disabled",
    updatedCommunity5.nsfw_content_allowed,
    false,
  );
  TestValidator.equals(
    "no approval requirements",
    !updatedCommunity5.require_post_approval &&
      !updatedCommunity5.require_comment_approval,
    true,
  );

  // Step 8: Test title and description updates along with permission changes
  const finalCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          title: "Updated Test Community - Image Only",
          description:
            "Community updated to focus exclusively on image content with relaxed moderation",
          allow_text_posts: false,
          allow_link_posts: false,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(finalCommunity);

  // Validate final comprehensive update
  TestValidator.equals(
    "title updated correctly",
    finalCommunity.title,
    "Updated Test Community - Image Only",
  );
  TestValidator.equals(
    "description updated correctly",
    finalCommunity.description,
    "Community updated to focus exclusively on image content with relaxed moderation",
  );
  TestValidator.equals(
    "image-only policy maintained",
    finalCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "text posts remain disabled",
    finalCommunity.allow_text_posts,
    false,
  );
  TestValidator.equals(
    "link posts remain disabled",
    finalCommunity.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "no approval requirements maintained",
    !finalCommunity.require_post_approval &&
      !finalCommunity.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "NSFW policy maintained",
    finalCommunity.nsfw_content_allowed,
    false,
  );

  // Final validation: Ensure community name remains immutable
  TestValidator.equals(
    "community name unchanged",
    finalCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "creator information preserved",
    finalCommunity.creator.username,
    user.username,
  );
}
