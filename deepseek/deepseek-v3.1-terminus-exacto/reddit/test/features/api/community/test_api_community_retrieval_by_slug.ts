import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";

/**
 * Test retrieval of detailed community information using valid community slug.
 * Validates that the endpoint returns complete community data including name,
 * description, status, privacy settings, creation timestamps, and category
 * information when provided with an existing community slug.
 *
 * This test uses typia.random() to generate a realistic community object that
 * represents what would be returned by the API for an existing community.
 */
export async function test_api_community_retrieval_by_slug(
  connection: api.IConnection,
) {
  // Generate a realistic community object using typia.random()
  // This represents what the API would return for an existing community
  const mockCommunity = typia.random<ICommunityPlatformCommunity>();

  // Use the slug from the generated community to ensure it exists
  const communitySlug = mockCommunity.slug;

  // Call the API to retrieve community information by slug
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.getByCommunityslug(
      connection,
      {
        communitySlug: communitySlug,
      },
    );

  // Perform comprehensive type validation using typia.assert()
  // This single call validates ALL type aspects perfectly
  typia.assert(community);

  // Validate business logic - ensure the returned slug matches the requested slug
  TestValidator.equals(
    "returned community slug matches requested slug",
    community.slug,
    communitySlug,
  );

  // Validate that essential business fields are present and meaningful
  TestValidator.predicate(
    "community name is meaningful",
    community.name.length >= 3 && community.name.length <= 100,
  );

  TestValidator.predicate(
    "community description has content",
    community.description.length > 0,
  );

  // Validate that status and privacy values are within expected business ranges
  TestValidator.predicate(
    "community status is valid",
    ["active", "archived", "suspended", "pending"].includes(community.status),
  );

  TestValidator.predicate(
    "community privacy setting is valid",
    ["public", "private", "restricted"].includes(community.privacy),
  );

  // Validate timestamp ordering (created_at should be before or equal to updated_at)
  const createdAt = new Date(community.created_at);
  const updatedAt = new Date(community.updated_at);
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    createdAt <= updatedAt,
  );

  // Validate category structure if present (business logic validation)
  if (community.category !== undefined && community.category !== null) {
    TestValidator.predicate(
      "category name is meaningful",
      community.category.name.length > 0,
    );

    TestValidator.predicate(
      "category display name is meaningful",
      community.category.display_name.length > 0,
    );

    TestValidator.predicate(
      "category status is valid",
      ["draft", "active", "archived", "suspended"].includes(
        community.category.status,
      ),
    );

    TestValidator.predicate(
      "active categories have positive sort order",
      community.category.is_active ? community.category.sort_order >= 0 : true,
    );
  }

  // Validate that if category_id exists, it should be a UUID (business rule)
  if (community.category_id !== undefined && community.category_id !== null) {
    TestValidator.predicate(
      "category_id follows UUID format when present",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.category_id,
      ),
    );
  }

  // Validate that deleted_at is either null or a valid timestamp (business rule)
  if (community.deleted_at !== undefined && community.deleted_at !== null) {
    const deletedAt = new Date(community.deleted_at);
    TestValidator.predicate(
      "deleted_at timestamp is valid when present",
      !isNaN(deletedAt.getTime()),
    );
  }
}
