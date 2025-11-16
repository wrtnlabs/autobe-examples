import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that unauthenticated requests to create a category are rejected.
 *
 * This test validates the authentication requirement for category creation.
 * Only authenticated administrators can create categories. When an
 * unauthenticated request attempts to create a category, the API should reject
 * it with a 401 Unauthorized response.
 *
 * The test flow:
 *
 * 1. Create an unauthenticated connection by clearing authorization headers
 * 2. Attempt to create a category without authentication credentials
 * 3. Verify the request fails with 401 Unauthorized error
 * 4. Confirm authentication is required for category creation
 */
export async function test_api_category_creation_unauthenticated(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to create a category without authentication
  // Should fail with 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated request should fail with 401",
    401,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        unauthConn,
        {
          body: {
            name: RandomGenerator.name(2),
            slug: RandomGenerator.alphabets(10),
            display_order: 1,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );
}
