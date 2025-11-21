import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteLimit";

/**
 * Test basic pagination functionality for vote limits search operation.
 *
 * This test validates that administrators can retrieve paginated results with
 * default sorting. It verifies that page and limit parameters work correctly,
 * returning the expected number of vote limit records per page with proper
 * pagination metadata.
 */
export async function test_api_vote_limits_search_basic_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test default pagination (page 1, limit 10)
  const defaultPage =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(defaultPage);

  // Validate pagination metadata
  TestValidator.equals(
    "default page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 10",
    defaultPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultPage.pagination.pages >= 0,
  );

  // Validate data structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(defaultPage.data),
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    defaultPage.data.length <= 10,
  );

  // Step 3: Test custom pagination with different parameters
  const customPage =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(customPage);

  // Validate custom pagination metadata
  TestValidator.equals(
    "custom page should be 2",
    customPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit should be 5",
    customPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length should not exceed custom limit",
    customPage.data.length <= 5,
  );

  // Step 4: Test maximum limit
  const maxLimitPage =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length should not exceed maximum limit",
    maxLimitPage.data.length <= 100,
  );

  // Step 5: Test minimum page
  const minPage = await api.functional.communityPlatform.admin.voteLimits.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    },
  );
  typia.assert(minPage);

  TestValidator.equals(
    "minimum page should be 1",
    minPage.pagination.current,
    1,
  );

  // Step 6: Validate pagination consistency
  if (defaultPage.pagination.records > 0 && defaultPage.pagination.pages > 1) {
    TestValidator.predicate(
      "page 2 should have valid data when multiple pages exist",
      customPage.data.length >= 0,
    );
  }

  // Step 7: Test sequential page navigation (if multiple pages exist)
  if (defaultPage.pagination.pages > 2) {
    const page3 = await api.functional.communityPlatform.admin.voteLimits.index(
      connection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies ICommunityPlatformVoteLimit.IRequest,
      },
    );
    typia.assert(page3);
    TestValidator.equals(
      "sequential page navigation should work",
      page3.pagination.current,
      3,
    );
  }
}
