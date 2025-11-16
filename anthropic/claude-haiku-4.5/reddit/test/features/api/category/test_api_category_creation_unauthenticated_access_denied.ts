import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_unauthenticated_access_denied(
  connection: api.IConnection,
) {
  /**
   * Test unauthenticated category creation denial.
   *
   * This test verifies that attempting to create a category without proper
   * administrator authentication results in an authorization error. The
   * endpoint should reject the request and prevent unauthorized access to
   * category management functionality.
   */

  // Create an unauthenticated connection by clearing authorization headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Prepare category creation data
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  // Attempt to create a category without authentication
  // This should fail with an authorization error
  await TestValidator.error(
    "unauthenticated request should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        unauthenticatedConnection,
        {
          body: categoryData,
        },
      );
    },
  );
}
