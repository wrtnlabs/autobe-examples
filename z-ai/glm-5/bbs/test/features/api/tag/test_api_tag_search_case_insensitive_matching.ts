import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_search_case_insensitive_matching(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Get all tags to understand what exists in the system
  const allTagsResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(allTagsResponse);
  // Step 2: Test case-insensitive search - lowercase 'script' should match 'JavaScript', 'TypeScript', etc.
  const scriptSearchResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: { search: "script" } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(scriptSearchResponse);
  // Verify case-insensitive matching - all returned tags should contain 'script' (case-insensitive)
  for (const tag of scriptSearchResponse.data) {
    TestValidator.predicate(
      `Tag '${tag.name}' should contain 'script' case-insensitively`,
      tag.name.toLowerCase().includes("script"),
    );
  }
  // Step 3: Test case-insensitive search with uppercase search term - 'PYTHON' should find 'python'
  const pythonSearchResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: { search: "PYTHON" } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(pythonSearchResponse);
  // Verify case-insensitive matching - all returned tags should contain 'python' (case-insensitive)
  for (const tag of pythonSearchResponse.data) {
    TestValidator.predicate(
      `Tag '${tag.name}' should contain 'python' case-insensitively`,
      tag.name.toLowerCase().includes("python"),
    );
  }
  // Step 4: Test partial matching - 'node' should match 'NodeJS', 'nodejs', etc.
  const nodeSearchResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: { search: "node" } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(nodeSearchResponse);
  // Verify partial matching - all returned tags should contain 'node' (case-insensitive)
  for (const tag of nodeSearchResponse.data) {
    TestValidator.predicate(
      `Tag '${tag.name}' should contain 'node' case-insensitively`,
      tag.name.toLowerCase().includes("node"),
    );
  }
  // Step 5: Test empty result handling - search for non-existent term
  const nonExistentSearchResponse =
    await api.functional.discussionBoard.tags.index(connection, {
      body: {
        search: "xyznonexistenttag12345",
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(nonExistentSearchResponse);
  // Verify empty result set returns proper pagination structure
  TestValidator.equals(
    "Empty search should return empty data array",
    nonExistentSearchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "Empty search should have records = 0",
    nonExistentSearchResponse.pagination.records,
    0,
  );
  // Step 6: Verify pagination structure is valid for all responses
  TestValidator.predicate(
    "script search has valid pagination",
    scriptSearchResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "python search has valid pagination",
    pythonSearchResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "node search has valid pagination",
    nodeSearchResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "empty search has valid pagination",
    nonExistentSearchResponse.pagination.current >= 1,
  );
}
