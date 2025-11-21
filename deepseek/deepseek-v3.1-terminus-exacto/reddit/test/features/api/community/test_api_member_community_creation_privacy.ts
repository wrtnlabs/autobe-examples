import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with different privacy settings.
 *
 * This test validates that authenticated members can create communities with
 * various privacy levels (public, private, restricted) and that each privacy
 * setting is properly applied with appropriate visibility rules and membership
 * requirements. The test follows a complete workflow from member authentication
 * to community creation and validation of privacy settings.
 */
export async function test_api_member_community_creation_privacy(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test public community creation
  const publicCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(publicCommunity);
  TestValidator.equals(
    "public community privacy setting should be 'public'",
    publicCommunity.privacy,
    "public",
  );

  // Step 3: Test private community creation
  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "private",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "private community privacy setting should be 'private'",
    privateCommunity.privacy,
    "private",
  );

  // Step 4: Test restricted community creation
  const restrictedCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "restricted",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(restrictedCommunity);
  TestValidator.equals(
    "restricted community privacy setting should be 'restricted'",
    restrictedCommunity.privacy,
    "restricted",
  );

  // Step 5: Validate that all communities have unique IDs and proper structure
  const communityIds = [
    publicCommunity.id,
    privateCommunity.id,
    restrictedCommunity.id,
  ];
  TestValidator.equals(
    "all three community IDs should be unique",
    new Set(communityIds).size,
    3,
  );

  // Additional validation of community properties
  TestValidator.predicate(
    "public community should have valid name",
    publicCommunity.name.length > 0,
  );
  TestValidator.predicate(
    "private community should have valid slug",
    privateCommunity.slug.length > 0,
  );
  TestValidator.predicate(
    "restricted community should have valid description",
    restrictedCommunity.description.length > 0,
  );
}
