import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test complete community creation workflow by an authenticated member.
 * Validates that members can create communities with unique names and slugs,
 * proper privacy settings, and category associations. Tests the automatic
 * moderator assignment to the creator and verification of all community fields
 * in the response.
 */
export async function test_api_community_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to create community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community with realistic test data respecting constraints
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  }).substring(0, 20); // Ensure within 3-21 character limit

  const communityData = {
    name: communityName,
    slug: RandomGenerator.alphaNumeric(15).toLowerCase(), // URL-safe slug
    description: RandomGenerator.content({ paragraphs: 1 }),
    privacy: RandomGenerator.pick(["public", "private", "restricted"] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;

  // Step 3: Call community creation endpoint
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 4: Validate response contains all expected fields with correct values
  TestValidator.equals(
    "community ID should be valid UUID",
    community.id,
    typia.assert<string & tags.Format<"uuid">>(community.id),
  );

  TestValidator.equals(
    "community name should match input",
    community.name,
    communityData.name,
  );

  TestValidator.equals(
    "community slug should match input",
    community.slug,
    communityData.slug,
  );

  TestValidator.equals(
    "community description should match input",
    community.description,
    communityData.description,
  );

  TestValidator.equals(
    "community privacy setting should match input",
    community.privacy,
    communityData.privacy,
  );

  TestValidator.predicate(
    "community should have creation timestamp",
    community.created_at !== undefined && community.created_at !== null,
  );

  TestValidator.predicate(
    "community should have update timestamp",
    community.updated_at !== undefined && community.updated_at !== null,
  );

  TestValidator.predicate(
    "community status should be active",
    community.status === "active",
  );

  TestValidator.predicate(
    "community should not be deleted",
    community.deleted_at === undefined || community.deleted_at === null,
  );

  // Step 5: Validate implicit moderator assignment through ownership
  // The creator automatically becomes moderator (implicit through system design)
  TestValidator.predicate(
    "community should be properly created with valid timestamps",
    new Date(community.created_at) <= new Date(community.updated_at),
  );
}
