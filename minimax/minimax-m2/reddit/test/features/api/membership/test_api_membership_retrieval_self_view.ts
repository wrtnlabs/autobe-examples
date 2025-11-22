import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_membership_retrieval_self_view(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "TestPassword123!";

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: "Seoul, South Korea",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a test community
  const communityName: string = `test_community_${RandomGenerator.alphaNumeric(8)}`;

  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
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
  typia.assert(community);

  // Step 3: User joins the community directly
  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.join(connection, {
      communityName: communityName,
    });
  typia.assert(membership);

  // Step 4: Retrieve the user's own membership details using the target endpoint
  const userMembership: IRedditPlatformCommunityMembership.IInvert =
    await api.functional.redditPlatform.communities.members.at(connection, {
      communityName: communityName,
      userId: user.id,
    });
  typia.assert(userMembership);

  // Step 5: Validate the membership response
  TestValidator.equals(
    "membership user ID matches the authenticated user",
    userMembership.id,
    user.id,
  );

  TestValidator.equals(
    "community name matches the created community",
    userMembership.community.name,
    communityName,
  );

  TestValidator.equals(
    "membership level is set correctly",
    userMembership.membership_level,
    "subscriber",
  );

  TestValidator.predicate(
    "join date is present and valid",
    userMembership.joined_at !== null && userMembership.joined_at !== undefined,
  );

  TestValidator.predicate(
    "post permissions are granted for public community",
    userMembership.post_permissions === true,
  );

  TestValidator.predicate(
    "comment permissions are granted for public community",
    userMembership.comment_permissions === true,
  );

  TestValidator.predicate(
    "vote permissions are granted for public community",
    userMembership.vote_permissions === true,
  );

  TestValidator.equals(
    "community ID matches the created community",
    userMembership.community.id,
    community.id,
  );

  TestValidator.equals(
    "community title matches the created community",
    userMembership.community.title,
    community.title,
  );

  TestValidator.equals(
    "community type is public",
    userMembership.community.type,
    "public",
  );

  TestValidator.predicate(
    "membership record ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userMembership.id,
    ),
  );
}
