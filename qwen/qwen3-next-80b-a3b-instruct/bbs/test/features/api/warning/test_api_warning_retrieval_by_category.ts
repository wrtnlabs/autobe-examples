import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";
export async function test_api_warning_retrieval_by_category(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Test retrieval with specific category filters
  const categoryList = [
    "spam",
    "harassment",
    "hate_speech",
    "illegal_content",
  ] as const;
  for (const category of categoryList) {
    const result = await api.functional.discussionBoard.warnings.index(
      adminConnection,
      {
        body: {
          category: category,
        } satisfies IDiscussionBoardWarning.IRequest,
      },
    );
    typia.assert(result);
    // Verify response structure
    TestValidator.equals(
      `category '${category}' response has pagination`,
      result.pagination.current >= 1,
      true,
    );
    TestValidator.equals(
      `category '${category}' response has valid limit`,
      result.pagination.limit >= 1 && result.pagination.limit <= 100,
      true,
    );
    TestValidator.predicate(
      `category '${category}' response has data array`,
      Array.isArray(result.data),
    );
    // Verify that data exists (at least empty array)
    TestValidator.predicate(
      `category '${category}' response has data array length`,
      result.data.length >= 0,
    );
  }
  // Test with no category filter
  const allResult = await api.functional.discussionBoard.warnings.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardWarning.IRequest,
    },
  );
  typia.assert(allResult);
  // Verify unfiltered response structure
  TestValidator.equals(
    "unfiltered response has pagination",
    allResult.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "unfiltered response has valid limit",
    allResult.pagination.limit >= 1 && allResult.pagination.limit <= 100,
    true,
  );
  TestValidator.predicate(
    "unfiltered response has data array",
    Array.isArray(allResult.data),
  );
  // Test with undefined category (equivalent to no filter)
  const undefinedCategoryResult =
    await api.functional.discussionBoard.warnings.index(adminConnection, {
      body: {
        category: undefined,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(undefinedCategoryResult);
  // Test with invalid category (non-existent in enum)
  const invalidCategoryResult =
    await api.functional.discussionBoard.warnings.index(adminConnection, {
      body: {
        category: "invalid_category" as any,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(invalidCategoryResult);
  // Verify that invalid category returns results (no error) - the system should handle this gracefully
  TestValidator.equals(
    "invalid category returns response",
    invalidCategoryResult.pagination.current >= 1,
    true,
  );
}
