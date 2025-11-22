import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_creation_with_custom_settings(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated registered user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(12);
  const password = RandomGenerator.alphaNumeric(16);

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email: userEmail,
        password,
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        location: RandomGenerator.name(1),
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community with custom configuration settings
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const communityTitle = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const customCommunitySettings = {
    name: communityName,
    title: communityTitle,
    description: communityDescription,
    type: "restricted" as const, // Restricted access - approval required for participation
    allow_text_posts: true,
    allow_link_posts: false, // Disable link posts
    allow_image_posts: true,
    require_post_approval: true, // Posts require moderator approval
    require_comment_approval: true, // Comments require moderator approval
    nsfw_content_allowed: false, // No NSFW content allowed
  } satisfies IRedditPlatformCommunity.ICreate;

  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: customCommunitySettings,
      },
    );
  typia.assert(community);

  // Step 3: Validate community creation and custom settings
  TestValidator.equals(
    "community name matches",
    community.name,
    customCommunitySettings.name,
  );
  TestValidator.equals(
    "community title matches",
    community.title,
    customCommunitySettings.title,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    customCommunitySettings.description,
  );
  TestValidator.equals(
    "community type is restricted",
    community.type,
    "restricted",
  );
  TestValidator.equals(
    "text posts allowed",
    community.allow_text_posts,
    customCommunitySettings.allow_text_posts,
  );
  TestValidator.equals(
    "link posts disabled",
    community.allow_link_posts,
    customCommunitySettings.allow_link_posts,
  );
  TestValidator.equals(
    "image posts allowed",
    community.allow_image_posts,
    customCommunitySettings.allow_image_posts,
  );
  TestValidator.equals(
    "post approval required",
    community.require_post_approval,
    customCommunitySettings.require_post_approval,
  );
  TestValidator.equals(
    "comment approval required",
    community.require_comment_approval,
    customCommunitySettings.require_comment_approval,
  );
  TestValidator.equals(
    "NSFW content not allowed",
    community.nsfw_content_allowed,
    customCommunitySettings.nsfw_content_allowed,
  );

  // Step 4: Validate community creator and initial state
  TestValidator.equals(
    "creator is authenticated user",
    community.creator.id,
    user.id,
  );
  TestValidator.equals(
    "creator username matches",
    community.creator.username,
    user.username,
  );
  TestValidator.equals("initial member count is 1", community.member_count, 1);
  TestValidator.equals(
    "initial subscriber count is 1",
    community.subscriber_count,
    1,
  );
  TestValidator.equals("initial post count is 0", community.post_count, 0);
  TestValidator.equals(
    "community status is active",
    community.status,
    "active",
  );

  // Step 5: Validate timestamps are present and reasonable
  TestValidator.predicate(
    "created_at timestamp is valid",
    new Date(community.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    new Date(community.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at is not in future",
    new Date(community.created_at).getTime() <= Date.now() + 1000,
  );
  TestValidator.predicate(
    "updated_at is not in future",
    new Date(community.updated_at).getTime() <= Date.now() + 1000,
  );

  // Step 6: Validate business status
  TestValidator.equals(
    "business status is active",
    community.business_status,
    "active",
  );

  // Step 7: Test community configuration enforcement
  // The restricted access type should require approval for participation
  // This will be validated in the actual API behavior when users try to join/post
  TestValidator.predicate(
    "community is configured for restricted access requiring approvals",
    community.type === "restricted" &&
      community.require_post_approval === true &&
      community.require_comment_approval === true,
  );

  // Step 8: Validate content type restrictions
  // Text and image posts allowed, but link posts disabled
  TestValidator.predicate(
    "content type restrictions are properly configured",
    community.allow_text_posts === true &&
      community.allow_image_posts === true &&
      community.allow_link_posts === false,
  );

  // Step 9: Validate NSFW content policy
  TestValidator.equals(
    "NSFW content is disabled",
    community.nsfw_content_allowed,
    false,
  );

  console.log(`✅ Community "${community.name}" created successfully with custom settings:
    - Access Type: ${community.type} (approval required for participation)
    - Content Permissions: Text=${community.allow_text_posts}, Link=${community.allow_link_posts}, Image=${community.allow_image_posts}
    - Moderation: Post Approval=${community.require_post_approval}, Comment Approval=${community.require_comment_approval}
    - NSFW Content: ${community.nsfw_content_allowed ? "Allowed" : "Not Allowed"}
    - Creator: ${community.creator.username}
    - Members: ${community.member_count}, Subscribers: ${community.subscriber_count}`);
}
