import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_creation_different_access_types(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user for community creation testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const authenticatedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: RandomGenerator.name(2),
        website_url: `https://${RandomGenerator.alphaNumeric(8)}.example.com`,
        avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`,
        href: "https://test.example.com/community/create",
        referrer: "https://test.example.com/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(authenticatedUser);
  TestValidator.equals(
    "user authentication successful",
    authenticatedUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user has valid token",
    authenticatedUser.token.access.length > 0,
    true,
  );

  // Step 2: Create public community - should allow immediate access
  const publicCommunityName = `public_${RandomGenerator.alphaNumeric(6)}`;
  const publicCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: publicCommunityName,
          title: "Public Test Community",
          description:
            "This is a public community where anyone can view and participate immediately",
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
  typia.assert(publicCommunity);
  TestValidator.equals(
    "public community name matches",
    publicCommunity.name,
    publicCommunityName,
  );
  TestValidator.equals(
    "public community type is public",
    publicCommunity.type,
    "public",
  );
  TestValidator.equals(
    "public community status is active",
    publicCommunity.status,
    "active",
  );
  TestValidator.equals(
    "public community creator matches authenticated user",
    publicCommunity.creator.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "public community allows text posts",
    publicCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "public community allows link posts",
    publicCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "public community allows image posts",
    publicCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "public community doesn't require post approval",
    publicCommunity.require_post_approval,
    false,
  );
  TestValidator.equals(
    "public community doesn't require comment approval",
    publicCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "public community doesn't allow NSFW content",
    publicCommunity.nsfw_content_allowed,
    false,
  );
  TestValidator.equals(
    "public community has zero members initially",
    publicCommunity.member_count,
    0,
  );
  TestValidator.equals(
    "public community has zero posts initially",
    publicCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "public community has zero subscribers initially",
    publicCommunity.subscriber_count,
    0,
  );

  // Step 3: Create restricted community - view-only, participation requires approval
  const restrictedCommunityName = `restricted_${RandomGenerator.alphaNumeric(6)}`;
  const restrictedCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: restrictedCommunityName,
          title: "Restricted Test Community",
          description:
            "This is a restricted community where anyone can view but participation requires approval",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: false,
          require_post_approval: true,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(restrictedCommunity);
  TestValidator.equals(
    "restricted community name matches",
    restrictedCommunity.name,
    restrictedCommunityName,
  );
  TestValidator.equals(
    "restricted community type is restricted",
    restrictedCommunity.type,
    "restricted",
  );
  TestValidator.equals(
    "restricted community status is active",
    restrictedCommunity.status,
    "active",
  );
  TestValidator.equals(
    "restricted community creator matches authenticated user",
    restrictedCommunity.creator.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "restricted community allows text posts",
    restrictedCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "restricted community allows link posts",
    restrictedCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "restricted community doesn't allow image posts",
    restrictedCommunity.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "restricted community requires post approval",
    restrictedCommunity.require_post_approval,
    true,
  );
  TestValidator.equals(
    "restricted community doesn't require comment approval",
    restrictedCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "restricted community doesn't allow NSFW content",
    restrictedCommunity.nsfw_content_allowed,
    false,
  );
  TestValidator.equals(
    "restricted community has zero members initially",
    restrictedCommunity.member_count,
    0,
  );
  TestValidator.equals(
    "restricted community has zero posts initially",
    restrictedCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "restricted community has zero subscribers initially",
    restrictedCommunity.subscriber_count,
    0,
  );

  // Step 4: Create private community - approval required for both viewing and participation
  const privateCommunityName = `private_${RandomGenerator.alphaNumeric(6)}`;
  const privateCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: privateCommunityName,
          title: "Private Test Community",
          description:
            "This is a private community where approval is required for both viewing and participation",
          type: "private",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: false,
          require_post_approval: true,
          require_comment_approval: true,
          nsfw_content_allowed: true,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "private community name matches",
    privateCommunity.name,
    privateCommunityName,
  );
  TestValidator.equals(
    "private community type is private",
    privateCommunity.type,
    "private",
  );
  TestValidator.equals(
    "private community status is active",
    privateCommunity.status,
    "active",
  );
  TestValidator.equals(
    "private community creator matches authenticated user",
    privateCommunity.creator.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "private community allows text posts",
    privateCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "private community doesn't allow link posts",
    privateCommunity.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "private community doesn't allow image posts",
    privateCommunity.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "private community requires post approval",
    privateCommunity.require_post_approval,
    true,
  );
  TestValidator.equals(
    "private community requires comment approval",
    privateCommunity.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "private community allows NSFW content",
    privateCommunity.nsfw_content_allowed,
    true,
  );
  TestValidator.equals(
    "private community has zero members initially",
    privateCommunity.member_count,
    0,
  );
  TestValidator.equals(
    "private community has zero posts initially",
    privateCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "private community has zero subscribers initially",
    privateCommunity.subscriber_count,
    0,
  );

  // Step 5: Validate access control implementation by checking community properties
  // Public communities should have most permissive settings
  TestValidator.predicate(
    "public community has most permissive access",
    publicCommunity.type === "public" &&
      publicCommunity.require_post_approval === false &&
      publicCommunity.require_comment_approval === false,
  );

  // Restricted communities should have moderate restrictions
  TestValidator.predicate(
    "restricted community has moderate restrictions",
    restrictedCommunity.type === "restricted" &&
      restrictedCommunity.require_post_approval === true &&
      restrictedCommunity.require_comment_approval === false,
  );

  // Private communities should have most restrictive settings
  TestValidator.predicate(
    "private community has most restrictive access",
    privateCommunity.type === "private" &&
      privateCommunity.require_post_approval === true &&
      privateCommunity.require_comment_approval === true,
  );

  // Step 6: Verify all communities have proper timestamps and metadata
  const currentTime = new Date().toISOString();

  // All communities should have been created recently
  TestValidator.predicate(
    "public community has valid creation timestamp",
    new Date(publicCommunity.created_at).getTime() <=
      new Date(currentTime).getTime(),
  );
  TestValidator.predicate(
    "restricted community has valid creation timestamp",
    new Date(restrictedCommunity.created_at).getTime() <=
      new Date(currentTime).getTime(),
  );
  TestValidator.predicate(
    "private community has valid creation timestamp",
    new Date(privateCommunity.created_at).getTime() <=
      new Date(currentTime).getTime(),
  );

  // All communities should have matching created and updated timestamps initially
  TestValidator.equals(
    "public community created and updated timestamps match initially",
    publicCommunity.created_at,
    publicCommunity.updated_at,
  );
  TestValidator.equals(
    "restricted community created and updated timestamps match initially",
    restrictedCommunity.created_at,
    restrictedCommunity.updated_at,
  );
  TestValidator.equals(
    "private community created and updated timestamps match initially",
    privateCommunity.created_at,
    privateCommunity.updated_at,
  );

  // Step 7: Verify community names are unique and follow naming conventions
  const communityNames = [
    publicCommunity.name,
    restrictedCommunity.name,
    privateCommunity.name,
  ];
  const uniqueNames = new Set(communityNames);
  TestValidator.equals("all community names are unique", uniqueNames.size, 3);

  // All names should follow the platform naming convention (alphanumeric and underscores only)
  const namePattern = /^[a-zA-Z0-9_]+$/;
  TestValidator.predicate(
    "public community name follows naming convention",
    namePattern.test(publicCommunity.name),
  );
  TestValidator.predicate(
    "restricted community name follows naming convention",
    namePattern.test(restrictedCommunity.name),
  );
  TestValidator.predicate(
    "private community name follows naming convention",
    namePattern.test(privateCommunity.name),
  );

  // Step 8: Final validation - ensure all communities are properly configured for their access types
  TestValidator.predicate(
    "access control implementation is correct for all community types",
    publicCommunity.type === "public" &&
      restrictedCommunity.type === "restricted" &&
      privateCommunity.type === "private" &&
      publicCommunity.creator.id === authenticatedUser.id &&
      restrictedCommunity.creator.id === authenticatedUser.id &&
      privateCommunity.creator.id === authenticatedUser.id,
  );
}
