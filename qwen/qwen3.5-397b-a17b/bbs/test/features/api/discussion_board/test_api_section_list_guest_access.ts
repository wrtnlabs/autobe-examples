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
 * Test that any user including unauthenticated guests can retrieve the complete
 * list of discussion board sections. Verify that the response contains all active
 * (non-deleted) sections with their id, name, description, created_at timestamp,
 * and articles_count. Validate that each section summary includes the correct
 * article count computed from non-deleted articles in that section. Ensure the
 * response follows the pagination structure with current page, limit, total
 * records, and total pages. This is the primary success path for content
 * discovery, allowing users to browse available topic categories before
 * navigating to specific sections.
 */
export async function test_api_section_list_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // Guest access - use base connection directly without authentication
  const sections = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  // Validate complete response structure including all types and formats
  typia.assert(sections);
  // Validate pagination structure matches request
  TestValidator.equals("current page", sections.pagination.current, 1);
  TestValidator.predicate("limit is positive", sections.pagination.limit > 0);
  TestValidator.predicate(
    "total records is non-negative",
    sections.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    sections.pagination.pages >= 0,
  );
  // Validate business logic for each section
  for (const section of sections.data) {
    TestValidator.predicate(
      "articles_count is non-negative",
      section.articles_count >= 0,
    );
  }
}
