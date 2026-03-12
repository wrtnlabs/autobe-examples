import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that guests can access the section listing endpoint without authentication.
 *
 * This test verifies that unauthenticated users (guests) can successfully retrieve
 * the list of discussion board sections. The endpoint should return paginated
 * section summaries with essential information for navigation without requiring
 * any authentication headers or tokens.
 */
export async function test_api_section_list_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Call PATCH /discussionBoard/sections with empty request body
  // All fields in IRequest are optional, so empty object is valid
  const response = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    },
  );
  // 3. Validate response structure using typia.assert()
  typia.assert(response);
  // 4. Verify pagination defaults (business logic validation)
  TestValidator.equals(
    "current page is 1 (default)",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20 (default)", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Verify default sorting (created_at descending - newest first)
  // If there are multiple sections, they should be sorted by created_at DESC
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevSection = response.data[i - 1];
      const currSection = response.data[i];
      TestValidator.predicate(
        `sections are sorted by created_at DESC: index ${i - 1} vs ${i}`,
        new Date(prevSection.created_at) >= new Date(currSection.created_at),
      );
    }
  }
}
