import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community creation requires authentication.
 *
 * This test verifies that unauthenticated requests to create communities are
 * properly rejected with HTTP 401 Unauthorized. It confirms that the community
 * creation endpoint is restricted to authenticated member users only, and that
 * guest or unauthenticated users cannot access this endpoint.
 *
 * Test flow:
 *
 * 1. Create an unauthenticated connection (empty headers)
 * 2. Attempt to create a community without authentication
 * 3. Verify that the API rejects the request with HTTP 401 Unauthorized
 * 4. Confirm authorization enforcement is working properly
 */
export async function test_api_community_creation_authorization_required(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing authorization headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Prepare community creation data
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 5 }),
    identifier: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  // Attempt to create a community without authentication and verify it fails with 401
  await TestValidator.httpError(
    "community creation should require authentication",
    401,
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        unauthenticatedConnection,
        {
          body: communityData,
        },
      );
    },
  );
}
