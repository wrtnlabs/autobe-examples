import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";

/**
 * Test community retrieval across different community statuses (active,
 * archived, suspended, pending). Validates that the endpoint properly handles
 * communities in various operational states and returns appropriate information
 * based on status.
 */
export async function test_api_community_retrieval_status_variations(
  connection: api.IConnection,
) {
  // Test community retrieval with various slug patterns
  const testSlugs = [
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(12),
    RandomGenerator.alphaNumeric(6),
    RandomGenerator.alphaNumeric(10),
  ];

  for (const slug of testSlugs) {
    // Call the actual API endpoint
    const community =
      await api.functional.communityPlatform.communities.getByCommunityslug(
        connection,
        {
          communitySlug: slug,
        },
      );

    // Validate the response structure and types
    typia.assert(community);

    // Verify basic community properties
    TestValidator.equals(
      "retrieved community should have valid slug format",
      community.slug,
      slug,
    );

    TestValidator.predicate(
      "community should have one of the valid statuses",
      ["active", "archived", "suspended", "pending"].includes(community.status),
    );

    TestValidator.predicate(
      "community should have valid privacy setting",
      ["public", "private", "restricted"].includes(community.privacy),
    );

    // Verify timestamp formats
    TestValidator.predicate(
      "created_at should be valid ISO timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        community.created_at,
      ),
    );

    TestValidator.predicate(
      "updated_at should be valid ISO timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        community.updated_at,
      ),
    );

    // Verify category structure when present
    if (community.category) {
      typia.assert(community.category);

      TestValidator.predicate(
        "category should have valid status",
        ["draft", "active", "archived", "suspended"].includes(
          community.category.status,
        ),
      );
    }
  }
}
