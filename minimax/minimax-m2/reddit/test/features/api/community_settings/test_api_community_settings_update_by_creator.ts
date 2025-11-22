import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_settings_update_by_creator(
  connection: api.IConnection,
) {
  // Create a new user account to be the community creator
  const creatorUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://reddit-platform.test/community/create",
        referrer: "https://reddit-platform.test/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(creatorUser);

  // Create a community with default settings
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const initialCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Original Community Title",
          description: "Original community description for testing",
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
  typia.assert(initialCommunity);

  TestValidator.equals(
    "community created with original title",
    initialCommunity.title,
    "Original Community Title",
  );
  TestValidator.equals(
    "community created with original description",
    initialCommunity.description,
    "Original community description for testing",
  );
  TestValidator.equals(
    "community created as public",
    initialCommunity.type,
    "public",
  );
  TestValidator.equals(
    "text posts allowed initially",
    initialCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts allowed initially",
    initialCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "image posts allowed initially",
    initialCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "no post approval required initially",
    initialCommunity.require_post_approval,
    false,
  );
  TestValidator.equals(
    "no comment approval required initially",
    initialCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "NSFW content not allowed initially",
    initialCommunity.nsfw_content_allowed,
    false,
  );
  TestValidator.equals(
    "community status is active",
    initialCommunity.status,
    "active",
  );

  // Update basic community information
  const updatedCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          title: "Updated Community Title",
          description:
            "Updated community description with new information and guidelines",
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  TestValidator.equals(
    "title updated successfully",
    updatedCommunity.title,
    "Updated Community Title",
  );
  TestValidator.equals(
    "description updated successfully",
    updatedCommunity.description,
    "Updated community description with new information and guidelines",
  );
  TestValidator.equals(
    "community name remains unchanged",
    updatedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "creator information preserved",
    updatedCommunity.creator.id,
    creatorUser.id,
  );

  // Update content permissions and moderation settings
  const permissionUpdated =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          allow_text_posts: false,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: true,
          require_comment_approval: true,
          nsfw_content_allowed: true,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(permissionUpdated);

  TestValidator.equals(
    "text posts disabled",
    permissionUpdated.allow_text_posts,
    false,
  );
  TestValidator.equals(
    "link posts still allowed",
    permissionUpdated.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "image posts still allowed",
    permissionUpdated.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "post approval now required",
    permissionUpdated.require_post_approval,
    true,
  );
  TestValidator.equals(
    "comment approval now required",
    permissionUpdated.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "NSFW content now allowed",
    permissionUpdated.nsfw_content_allowed,
    true,
  );

  // Test access type modification
  const typeUpdated =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          type: "restricted",
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(typeUpdated);

  TestValidator.equals(
    "access type changed to restricted",
    typeUpdated.type,
    "restricted",
  );

  // Test operational status changes
  const statusUpdated =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          status: "restricted",
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(statusUpdated);

  TestValidator.equals(
    "operational status changed to restricted",
    statusUpdated.status,
    "restricted",
  );

  // Test business workflow status transition
  const businessStatusUpdated =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          business_status: "under_review",
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(businessStatusUpdated);

  TestValidator.equals(
    "business workflow status changed to under_review",
    businessStatusUpdated.business_status,
    "under_review",
  );

  // Verify all changes are persistent by fetching the community again
  const finalCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {},
      },
    );
  typia.assert(finalCommunity);

  TestValidator.equals(
    "final title matches updated title",
    finalCommunity.title,
    "Updated Community Title",
  );
  TestValidator.equals(
    "final description matches updated description",
    finalCommunity.description,
    "Updated community description with new information and guidelines",
  );
  TestValidator.equals(
    "final access type is restricted",
    finalCommunity.type,
    "restricted",
  );
  TestValidator.equals(
    "final text posts setting preserved",
    finalCommunity.allow_text_posts,
    false,
  );
  TestValidator.equals(
    "final link posts setting preserved",
    finalCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "final image posts setting preserved",
    finalCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "final post approval setting preserved",
    finalCommunity.require_post_approval,
    true,
  );
  TestValidator.equals(
    "final comment approval setting preserved",
    finalCommunity.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "final NSFW content setting preserved",
    finalCommunity.nsfw_content_allowed,
    true,
  );
  TestValidator.equals(
    "final operational status preserved",
    finalCommunity.status,
    "restricted",
  );
  TestValidator.equals(
    "final business workflow status preserved",
    finalCommunity.business_status,
    "under_review",
  );
  TestValidator.equals(
    "creator ownership maintained",
    finalCommunity.creator.id,
    creatorUser.id,
  );

  // Test multiple concurrent updates
  const multipleUpdates = await Promise.all([
    api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          title: "Concurrent Update 1",
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    ),
    api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          title: "Concurrent Update 2",
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    ),
  ]);

  typia.assert(multipleUpdates[0]);
  typia.assert(multipleUpdates[1]);

  TestValidator.equals(
    "first concurrent update succeeded",
    multipleUpdates[0].title,
    "Concurrent Update 1",
  );
  TestValidator.equals(
    "second concurrent update succeeded",
    multipleUpdates[1].title,
    "Concurrent Update 2",
  );
}
