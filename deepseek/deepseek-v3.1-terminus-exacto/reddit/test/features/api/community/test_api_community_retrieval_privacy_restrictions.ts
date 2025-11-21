import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";

/**
 * Test community retrieval behavior for different privacy settings.
 *
 * Validates that communities can be retrieved by their slug identifiers and
 * that the response contains complete community information including privacy
 * settings, metadata, and category associations. This test focuses on ensuring
 * the retrieval functionality works correctly for community entities regardless
 * of their privacy configuration.
 *
 * Since the available API only provides community retrieval functionality, this
 * test validates the basic retrieval operation and response structure rather
 * than testing privacy-based access restrictions which would require community
 * creation endpoints.
 */
export async function test_api_community_retrieval_privacy_restrictions(
  connection: api.IConnection,
) {
  // Generate a realistic community slug for testing
  const communitySlug = RandomGenerator.alphaNumeric(10);

  // Retrieve community by slug - this tests the core functionality
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.getByCommunityslug(
      connection,
      {
        communitySlug: communitySlug,
      },
    );

  // Validate the response structure using typia - this performs complete type validation
  typia.assert(community);

  // Test basic community properties
  TestValidator.equals(
    "community slug should match request",
    community.slug,
    communitySlug,
  );
  TestValidator.predicate(
    "community should have valid name between 3-21 characters",
    community.name.length >= 3 && community.name.length <= 21,
  );
  TestValidator.predicate(
    "community should have non-empty description",
    community.description.length > 0,
  );
  TestValidator.predicate(
    "community should have valid status",
    ["active", "archived", "suspended", "pending"].includes(community.status),
  );
  TestValidator.predicate(
    "community should have valid privacy setting",
    ["public", "private", "restricted"].includes(community.privacy),
  );

  // Validate timestamps are properly formatted (typia.assert already validated the format)
  TestValidator.predicate(
    "created_at should be valid ISO timestamp",
    !isNaN(Date.parse(community.created_at)),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO timestamp",
    !isNaN(Date.parse(community.updated_at)),
  );

  // Test optional category information when present
  if (community.category) {
    typia.assert(community.category);

    TestValidator.predicate(
      "category should have valid name",
      community.category.name.length > 0,
    );
    TestValidator.predicate(
      "category should have valid display name",
      community.category.display_name.length > 0,
    );
    TestValidator.predicate(
      "category should have valid slug",
      community.category.slug.length > 0,
    );
    TestValidator.predicate(
      "category should have valid description",
      community.category.description.length > 0,
    );
    TestValidator.predicate(
      "category should have valid sort order",
      community.category.sort_order >= 0,
    );
    TestValidator.equals(
      "category should be active",
      community.category.is_active,
      true,
    );
    TestValidator.predicate(
      "category should have valid status",
      ["draft", "active", "archived", "suspended"].includes(
        community.category.status,
      ),
    );
  }

  // Test retrieval with different slug to ensure different communities are returned
  const anotherCommunitySlug = RandomGenerator.alphaNumeric(10);

  const anotherCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.getByCommunityslug(
      connection,
      {
        communitySlug: anotherCommunitySlug,
      },
    );

  typia.assert(anotherCommunity);

  // Validate that different slugs return different communities
  TestValidator.notEquals(
    "different slugs should return different communities",
    community.id,
    anotherCommunity.id,
  );
  TestValidator.notEquals(
    "different slugs should have different names",
    community.name,
    anotherCommunity.name,
  );
}
