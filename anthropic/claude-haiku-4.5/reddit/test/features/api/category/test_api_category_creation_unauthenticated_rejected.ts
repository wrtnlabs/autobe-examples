import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_unauthenticated_rejected(
  connection: api.IConnection,
) {
  /**
   * Test unauthenticated category creation rejection.
   *
   * This test validates that the category creation endpoint properly enforces
   * authentication requirements. An unauthenticated request (without valid
   * administrator credentials) should be rejected with a 401 Unauthorized
   * error.
   *
   * Steps:
   *
   * 1. Create an unauthenticated connection by removing authentication headers
   * 2. Attempt to create a category with valid data but no authentication
   * 3. Verify that the API returns a 401 Unauthorized error
   * 4. Confirm that authentication is mandatory for category management
   */

  // Create unauthenticated connection by removing Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Prepare valid category creation data with slug matching pattern (lowercase alphanumeric and hyphens)
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: `${RandomGenerator.alphabets(5)}-${RandomGenerator.alphabets(5)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  // Test that unauthenticated request is rejected with 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated category creation should be rejected with 401",
    401,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        unauthConn,
        {
          body: categoryData,
        },
      );
    },
  );
}
