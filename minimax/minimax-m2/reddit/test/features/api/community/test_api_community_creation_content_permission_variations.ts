import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_creation_content_permission_variations(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: userEmail,
        password: "test_password_123",
        display_name: "Test User",
        bio: "E2E testing user for content permission validation",
        location: "Test City",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Test Community 1 - All content types allowed, no approval required
  const community1 =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `community_all_content_${RandomGenerator.alphaNumeric(8)}`,
          title: "All Content Community",
          description:
            "A community that allows all types of content without approval",
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
  typia.assert(community1);
  TestValidator.equals(
    "community 1 text posts allowed",
    community1.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "community 1 link posts allowed",
    community1.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "community 1 image posts allowed",
    community1.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "community 1 no post approval required",
    community1.require_post_approval,
    false,
  );
  TestValidator.equals(
    "community 1 no comment approval required",
    community1.require_comment_approval,
    false,
  );

  // Step 3: Test Community 2 - Text posts only, requires approval for posts and comments
  const community2 =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `community_text_only_${RandomGenerator.alphaNumeric(8)}`,
          title: "Text Only Community",
          description:
            "A community that only allows text posts with approval required",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: false,
          require_post_approval: true,
          require_comment_approval: true,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  TestValidator.equals(
    "community 2 text posts allowed",
    community2.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "community 2 link posts not allowed",
    community2.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "community 2 image posts not allowed",
    community2.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "community 2 requires post approval",
    community2.require_post_approval,
    true,
  );
  TestValidator.equals(
    "community 2 requires comment approval",
    community2.require_comment_approval,
    true,
  );

  // Step 4: Test Community 3 - Link posts only, NSFW allowed
  const community3 =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `community_links_nsfw_${RandomGenerator.alphaNumeric(8)}`,
          title: "Links & NSFW Community",
          description: "A community for sharing links including NSFW content",
          type: "private",
          allow_text_posts: false,
          allow_link_posts: true,
          allow_image_posts: false,
          require_post_approval: false,
          require_comment_approval: true,
          nsfw_content_allowed: true,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  TestValidator.equals(
    "community 3 text posts not allowed",
    community3.allow_text_posts,
    false,
  );
  TestValidator.equals(
    "community 3 link posts allowed",
    community3.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "community 3 image posts not allowed",
    community3.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "community 3 no post approval required",
    community3.require_post_approval,
    false,
  );
  TestValidator.equals(
    "community 3 requires comment approval",
    community3.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "community 3 NSFW content allowed",
    community3.nsfw_content_allowed,
    true,
  );

  // Step 5: Test Community 4 - Image posts with mixed approval requirements
  const community4 =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `community_images_${RandomGenerator.alphaNumeric(8)}`,
          title: "Image Sharing Community",
          description: "A community focused on image sharing with moderation",
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
  typia.assert(community4);
  TestValidator.equals(
    "community 4 text posts allowed",
    community4.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "community 4 link posts not allowed",
    community4.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "community 4 image posts allowed",
    community4.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "community 4 requires post approval",
    community4.require_post_approval,
    true,
  );
  TestValidator.equals(
    "community 4 no comment approval required",
    community4.require_comment_approval,
    false,
  );

  // Step 6: Test Community 5 - Restricted community with all content types
  const community5 =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `community_restricted_all_${RandomGenerator.alphaNumeric(8)}`,
          title: "Restricted All Content Community",
          description: "A restricted community allowing all content types",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community5);
  TestValidator.equals(
    "community 5 text posts allowed",
    community5.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "community 5 link posts allowed",
    community5.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "community 5 image posts allowed",
    community5.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "community 5 type is restricted",
    community5.type,
    "restricted",
  );
  TestValidator.equals(
    "community 5 no approval required",
    community5.require_post_approval,
    false,
  );

  // Step 7: Test validation - communities have correct creator association
  TestValidator.equals(
    "community 1 creator is authenticated user",
    community1.creator.id,
    user.id,
  );
  TestValidator.equals(
    "community 2 creator is authenticated user",
    community2.creator.id,
    user.id,
  );
  TestValidator.equals(
    "community 3 creator is authenticated user",
    community3.creator.id,
    user.id,
  );
  TestValidator.equals(
    "community 4 creator is authenticated user",
    community4.creator.id,
    user.id,
  );
  TestValidator.equals(
    "community 5 creator is authenticated user",
    community5.creator.id,
    user.id,
  );

  // Step 8: Test validation - communities have appropriate status
  TestValidator.equals(
    "community 1 status is active",
    community1.status,
    "active",
  );
  TestValidator.equals(
    "community 2 status is active",
    community2.status,
    "active",
  );
  TestValidator.equals(
    "community 3 status is active",
    community3.status,
    "active",
  );
  TestValidator.equals(
    "community 4 status is active",
    community4.status,
    "active",
  );
  TestValidator.equals(
    "community 5 status is active",
    community5.status,
    "active",
  );

  // Step 9: Test validation - member and post counts are initialized to 0
  TestValidator.equals(
    "community 1 member count initialized",
    community1.member_count,
    0,
  );
  TestValidator.equals(
    "community 1 post count initialized",
    community1.post_count,
    0,
  );
  TestValidator.equals(
    "community 2 member count initialized",
    community2.member_count,
    0,
  );
  TestValidator.equals(
    "community 2 post count initialized",
    community2.post_count,
    0,
  );
  TestValidator.equals(
    "community 3 subscriber count initialized",
    community3.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community 4 subscriber count initialized",
    community4.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community 5 subscriber count initialized",
    community5.subscriber_count,
    0,
  );
}
