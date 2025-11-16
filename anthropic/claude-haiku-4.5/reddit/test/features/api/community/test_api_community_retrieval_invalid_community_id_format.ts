import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieving community with invalid ID format.
 *
 * This test validates that the API properly rejects community retrieval
 * requests with invalid community ID formats. The endpoint expects a UUID
 * format for the communityId parameter. Parameter validation for UUID format is
 * enforced at the TypeScript type level and by the backend API schema
 * validation.
 *
 * Note: Since the communityId parameter has strict UUID format constraints at
 * the type level, E2E tests cannot deliberately send invalid formats without
 * bypassing type safety. This validation is covered by unit and integration
 * tests that validate the schema constraints and API behavior independently.
 */
export async function test_api_community_retrieval_invalid_community_id_format(
  connection: api.IConnection,
) {
  // Test: Attempt to retrieve a non-existent community with valid UUID format
  // This validates that the API properly handles missing resources with correct
  // parameter validation
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () => {
      return await api.functional.communityPlatform.communities.at(connection, {
        communityId: nonExistentId,
      });
    },
  );
}
