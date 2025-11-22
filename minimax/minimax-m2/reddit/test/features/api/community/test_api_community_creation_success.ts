import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userData: IRedditPlatformRegisteredUser.ICreate = {
    username: RandomGenerator.alphaNumeric(12), // 3-20 chars, alphanumeric
    email: userEmail,
    password: "TestPassword123!", // 8+ chars
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: "Seoul, South Korea",
    website_url: typia.random<string & tags.Format<"uri">>(),
    href: "https://example.com/community-test",
    referrer: "https://reddit.com",
  };

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(user);

  // Step 2: Create community with comprehensive configuration
  const communityData: IRedditPlatformCommunity.ICreate = {
    name: RandomGenerator.alphaNumeric(15), // 2-25 chars, alphanumeric + underscores
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    type: "public", // Access type: public/restricted/private
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    require_post_approval: false,
    require_comment_approval: false,
    nsfw_content_allowed: false,
  };

  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Validate community creation success
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community title matches input",
    community.title,
    communityData.title,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityData.description,
  );
  TestValidator.equals(
    "community type matches input",
    community.type,
    communityData.type,
  );
  TestValidator.equals(
    "text posts allowed",
    community.allow_text_posts,
    communityData.allow_text_posts,
  );
  TestValidator.equals(
    "link posts allowed",
    community.allow_link_posts,
    communityData.allow_link_posts,
  );
  TestValidator.equals(
    "image posts allowed",
    community.allow_image_posts,
    communityData.allow_image_posts,
  );
  TestValidator.equals(
    "post approval required",
    community.require_post_approval,
    communityData.require_post_approval,
  );
  TestValidator.equals(
    "comment approval required",
    community.require_comment_approval,
    communityData.require_comment_approval,
  );
  TestValidator.equals(
    "NSFW content allowed",
    community.nsfw_content_allowed,
    communityData.nsfw_content_allowed,
  );

  // Step 4: Verify default values are set correctly
  TestValidator.equals(
    "community status is active",
    community.status,
    "active",
  );
  TestValidator.equals("member count is zero", community.member_count, 0);
  TestValidator.equals("post count is zero", community.post_count, 0);
  TestValidator.equals(
    "subscriber count is zero",
    community.subscriber_count,
    0,
  );

  // Step 5: Verify creator assignment
  TestValidator.equals(
    "creator is the registered user",
    community.creator.id,
    user.id,
  );
  TestValidator.equals(
    "creator username matches",
    community.creator.username,
    user.username,
  );
  TestValidator.equals(
    "creator display name matches",
    community.creator.display_name,
    user.displayName,
  );

  // Step 6: Verify timestamps are present and valid
  TestValidator.predicate(
    "created_at timestamp is valid ISO format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      community.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid ISO format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      community.updated_at,
    ),
  );

  // Step 7: Verify business status
  TestValidator.predicate(
    "business status is valid",
    ["pending_verification", "active", "restricted"].includes(
      community.business_status,
    ),
  );
}
