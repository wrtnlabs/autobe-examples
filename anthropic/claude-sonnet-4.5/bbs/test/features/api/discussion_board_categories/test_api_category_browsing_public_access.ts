import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test that unauthenticated guests can browse discussion board categories
 * without authentication.
 *
 * This test validates the core requirement that category browsing is publicly
 * accessible, allowing all users including guests to discover and explore the
 * organizational taxonomy of economic and political discussions.
 *
 * Test workflow:
 *
 * 1. Create an unauthenticated connection (no auth headers)
 * 2. Execute PATCH /discussionBoard/categories with basic search parameters
 * 3. Validate successful response with proper structure
 * 4. Verify category data is accessible to unauthenticated users
 */
export async function test_api_category_browsing_public_access(
  connection: api.IConnection,
) {
  // Create unauthenticated connection for guest access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Execute category browsing without authentication
  const response: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(unauthConn, {
      body: {
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardCategory.IRequest,
    });

  // Validate response structure - this performs COMPLETE type validation
  typia.assert(response);

  // Test passes if typia.assert succeeds - response structure is valid
  // and categories are accessible to unauthenticated users
}
