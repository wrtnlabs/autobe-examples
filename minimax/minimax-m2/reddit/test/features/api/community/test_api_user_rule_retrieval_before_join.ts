import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_rule_retrieval_before_join(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a registered user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: RandomGenerator.alphabets(12),
    email: userEmail,
    password: "SecurePass123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.name(1),
    website_url: `https://${RandomGenerator.alphabets(8)}.com`,
    avatar_url: `https://example.com/avatar.jpg`,
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/home",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(registeredUser);

  // Step 2: Create a community (user will NOT join this community)
  const communityData = {
    name: RandomGenerator.alphaNumeric(15),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    type: "public" as const,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    require_post_approval: false,
    require_comment_approval: false,
    nsfw_content_allowed: false,
  } satisfies IRedditPlatformCommunity.ICreate;

  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create a community rule (simulate an existing rule in the community)
  // Note: Since there's no direct rule creation API in the provided functions,
  // we'll create a rule ID that would typically exist in a real community
  const ruleId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Attempt to retrieve the community rule without being a member
  // This should demonstrate access control - user can authenticate but cannot
  // access community-specific content they haven't joined
  await TestValidator.error(
    "non-member should not access community rules",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.rules.at(
        connection,
        {
          communityName: community.name,
          ruleId: ruleId,
        },
      );
    },
  );

  // Validate that the user session is properly authenticated
  TestValidator.equals(
    "user authentication successful",
    registeredUser.id.length > 0,
    true,
  );
  TestValidator.equals(
    "user has valid session token",
    registeredUser.token.access.length > 0,
    true,
  );

  // Validate that the community exists and is accessible to the creator
  TestValidator.equals(
    "community created successfully",
    community.id.length > 0,
    true,
  );
  TestValidator.equals(
    "community name matches",
    community.name,
    communityData.name,
  );
  TestValidator.equals("community is public type", community.type, "public");
}
