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

export async function test_api_section_browse_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Use actor-specific connection (no auth required for this endpoint)
  const actorConnection: api.IConnection = { host: connection.host };
  // 1. Browse sections with default pagination (page=1, limit=20)
  const defaultPage = await api.functional.discussionBoard.sections.index(
    actorConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Verify pagination structure
  TestValidator.equals(
    "default page has pagination",
    typeof defaultPage.pagination,
    "object",
  );
  TestValidator.equals(
    "default page has data",
    Array.isArray(defaultPage.data),
    true,
  );
  TestValidator.predicate(
    "default page records >= 0",
    defaultPage.pagination.records >= 0,
  );
  // 2. Test different page sizes
  const smallLimitPage = await api.functional.discussionBoard.sections.index(
    actorConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(smallLimitPage);
  TestValidator.predicate(
    "small limit page data <= 5",
    smallLimitPage.data.length <= 5,
  );
  // 3. Test empty result with large page number
  const emptyPage = await api.functional.discussionBoard.sections.index(
    actorConnection,
    {
      body: {
        page: 999999,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data is empty", emptyPage.data.length, 0);
  // 4. Test search functionality
  const searchPage = await api.functional.discussionBoard.sections.index(
    actorConnection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchPage);
  // 5. Test sorting options
  const newestPage = await api.functional.discussionBoard.sections.index(
    actorConnection,
    {
      body: {
        sortBy: "newest",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(newestPage);
  const oldestPage = await api.functional.discussionBoard.sections.index(
    actorConnection,
    {
      body: {
        sortBy: "oldest",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(oldestPage);
  // 6. Verify pagination calculations
  TestValidator.equals(
    "pagination fields exist",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.predicate("pages >= 0", defaultPage.pagination.pages >= 0);
}
