import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_joining_restricted_community(
  connection: api.IConnection,
) {
  // Create a registered user account for testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ""),
        email: userEmail,
        password: "TestPassword123!",
        display_name: "Test User",
        bio: "Test user for restricted community testing",
        location: "Test Location",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://example.com/test",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Create a restricted community
  const communityName: string = `restricted_${RandomGenerator.alphaNumeric(8).toLowerCase()}`;
  const createdCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Restricted Test Community ${RandomGenerator.name(1)}`,
          description:
            "A restricted community for testing join behavior where participation requires approval",
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
  typia.assert(createdCommunity);

  // Validate the community was created with correct restricted type
  TestValidator.equals(
    "community should be created with restricted type",
    createdCommunity.type,
    "restricted",
  );

  // Attempt to join the restricted community
  // For restricted communities, joining may result in a pending status or approval requirement
  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.join(connection, {
      communityName: communityName,
    });
  typia.assert(membership);

  // Validate the membership response
  TestValidator.equals(
    "membership should belong to correct community",
    membership.community.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "membership should belong to correct user",
    membership.member.id,
    registeredUser.id,
  );

  // Note: For restricted communities, the membership level might be 'subscriber' or 'member'
  // depending on the implementation. The key is that the system should handle restricted access properly
  TestValidator.predicate(
    "membership level should be valid for restricted community",
    ["subscriber", "member"].includes(membership.membership_level),
  );

  // Validate community information is preserved in the membership response
  TestValidator.equals(
    "community name should match",
    membership.community.name,
    communityName,
  );

  TestValidator.equals(
    "community type should remain restricted",
    membership.community.type,
    "restricted",
  );

  TestValidator.equals(
    "user information should match",
    membership.member.username,
    registeredUser.username,
  );
}
