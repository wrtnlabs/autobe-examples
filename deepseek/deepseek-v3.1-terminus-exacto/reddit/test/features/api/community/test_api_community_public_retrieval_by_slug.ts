import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that communities can be retrieved publicly by their slug identifier.
 * Validates that community information including name, description, privacy
 * settings, and category details are accessible without authentication. Tests
 * proper slug parameter handling and response structure validation for public
 * community data retrieval.
 */
export async function test_api_community_public_retrieval_by_slug(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/registration",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community with known slug for testing
  const communitySlug = RandomGenerator.alphabets(8).toLowerCase(); // URL-friendly slug
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const communityDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 10,
  });

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: communityDescription,
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Create unauthenticated connection for public retrieval test
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve community publicly by slug without authentication
  const retrievedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.getBySlug(unauthConn, {
      slug: communitySlug,
    });
  typia.assert(retrievedCommunity);

  // Step 5: Validate that retrieved community matches created community
  TestValidator.equals(
    "community ID should match",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name should match",
    retrievedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "community slug should match",
    retrievedCommunity.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "community description should match",
    retrievedCommunity.description,
    createdCommunity.description,
  );
  TestValidator.equals(
    "community privacy should match",
    retrievedCommunity.privacy,
    createdCommunity.privacy,
  );
  TestValidator.equals(
    "community status should match",
    retrievedCommunity.status,
    createdCommunity.status,
  );

  // Step 6: Validate that public retrieval returns complete community information
  TestValidator.predicate(
    "community should have creation timestamp",
    retrievedCommunity.created_at !== undefined,
  );
  TestValidator.predicate(
    "community should have update timestamp",
    retrievedCommunity.updated_at !== undefined,
  );
  TestValidator.predicate(
    "community should not be deleted",
    retrievedCommunity.deleted_at === undefined,
  );

  // Step 7: Additional validation for community metadata
  TestValidator.predicate(
    "community should have valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedCommunity.id,
    ),
  );
  TestValidator.predicate(
    "community name should not be empty",
    retrievedCommunity.name.length > 0,
  );
  TestValidator.predicate(
    "community slug should not be empty",
    retrievedCommunity.slug.length > 0,
  );
  TestValidator.predicate(
    "community description should not be empty",
    retrievedCommunity.description.length > 0,
  );
  TestValidator.predicate(
    "community privacy should be 'public'",
    retrievedCommunity.privacy === "public",
  );
  TestValidator.predicate(
    "community status should be valid",
    ["active", "archived", "suspended", "pending"].includes(
      retrievedCommunity.status,
    ),
  );
}
