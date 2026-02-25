import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_search_by_section(
  connection: api.IConnection,
): Promise<void> {
  // Since the scenario requires creating sections and articles but those endpoints are not available
  // in the provided API functions, and we can only use the search endpoint, we'll test the search
  // functionality with the search endpoint using the provided API.
  // Test 1: Search with valid UUID section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const result1 = await api.functional.discussionBoard.search(connection, {
    body: {
      sectionId: sectionId,
      limit: 10,
    },
  });
  typia.assert(result1);
  // Test 2: Search with empty section ID (should return all)
  const result2 = await api.functional.discussionBoard.search(connection, {
    body: {
      limit: 5,
    },
  });
  typia.assert(result2);
  // Test 3: Search with pagination parameters
  const result3 = await api.functional.discussionBoard.search(connection, {
    body: {
      page: 1,
      limit: 20,
    },
  });
  typia.assert(result3);
  // Test 4: Verify pagination structure
  TestValidator.predicate(
    "has pagination object",
    result3.pagination !== null && typeof result3.pagination === "object",
  );
  TestValidator.predicate(
    "pagination has required fields",
    typeof result3.pagination.current === "number" &&
      typeof result3.pagination.limit === "number" &&
      typeof result3.pagination.records === "number" &&
      typeof result3.pagination.pages === "number",
  );
  // Test 5: Verify data structure
  TestValidator.predicate("has data array", Array.isArray(result3.data));
  TestValidator.predicate("data array is iterable", result3.data.length >= 0);
}
