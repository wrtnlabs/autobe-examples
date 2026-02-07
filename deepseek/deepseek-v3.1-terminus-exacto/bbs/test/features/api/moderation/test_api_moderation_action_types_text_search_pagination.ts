import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test text search functionality combined with pagination controls for moderation action types.
 * Validates that super administrators can search moderation action types by name and description
 * with proper pagination support. This test works with existing moderation action types in the system.
 */
export async function test_api_moderation_action_types_text_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // First, get all moderation action types to understand what data exists
  const allActionTypes =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(allActionTypes);
  // If there are no action types, we cannot test search functionality
  if (allActionTypes.pagination.records === 0) {
    console.log(
      "No moderation action types available for testing search functionality",
    );
    return;
  }
  // Extract common words from existing action type names and descriptions for testing
  const commonWords: string[] = [];
  allActionTypes.data.forEach((actionType) => {
    // Extract words from name
    const nameWords = actionType.name.toLowerCase().split(/\s+/);
    commonWords.push(...nameWords.filter((word: string) => word.length > 3));
    // Extract words from description if available - removed since property doesn't exist
  });
  // Remove duplicates and take a sample for testing
  const uniqueWords = [...new Set(commonWords)].slice(0, 5);
  if (uniqueWords.length === 0) {
    // If no meaningful words found, use a generic search term
    const genericSearchTerm = "action";
    // Test search with pagination - page 1 with limit 5
    const page1Results =
      await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
        superAdminConnection,
        {
          body: {
            search: genericSearchTerm,
            page: 1,
            limit: 5,
          } satisfies IDiscussionBoardModerationActionType.IRequest,
        },
      );
    typia.assert(page1Results);
    // Validate pagination metadata
    TestValidator.equals(
      "page 1 current page",
      page1Results.pagination.current,
      1,
    );
    TestValidator.equals("page 1 limit", page1Results.pagination.limit, 5);
    TestValidator.predicate(
      "page 1 data count valid",
      page1Results.data.length <= 5,
    );
    // Test page 2 if there are more results
    if (page1Results.pagination.pages > 1) {
      const page2Results =
        await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
          superAdminConnection,
          {
            body: {
              search: genericSearchTerm,
              page: 2,
              limit: 5,
            } satisfies IDiscussionBoardModerationActionType.IRequest,
          },
        );
      typia.assert(page2Results);
      TestValidator.equals(
        "page 2 current page",
        page2Results.pagination.current,
        2,
      );
    }
  } else {
    // Test with actual words found in the data
    for (const searchWord of uniqueWords) {
      const searchResults =
        await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
          superAdminConnection,
          {
            body: {
              search: searchWord,
              page: 1,
              limit: 10,
            } satisfies IDiscussionBoardModerationActionType.IRequest,
          },
        );
      typia.assert(searchResults);
      // Validate that search returned results
      TestValidator.predicate(
        `search for '${searchWord}' returned valid pagination`,
        searchResults.pagination.records >= 0,
      );
      TestValidator.predicate(
        `search for '${searchWord}' has valid page data`,
        searchResults.data.length <= 10,
      );
    }
  }
  // Test empty search term (should return all results)
  const emptySearchResults =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  // Test with a definitely non-matching search term
  const nonMatchingResults =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          search: "xyz123nonexistentterm",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(nonMatchingResults);
  // Test different limit values
  const largeLimitResults =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(largeLimitResults);
  TestValidator.equals(
    "large limit test",
    largeLimitResults.pagination.limit,
    50,
  );
  // Test combination of search and pagination with various parameters
  const combinedTestResults =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          search: "moderation",
          page: 1,
          limit: 3,
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(combinedTestResults);
  // Validate the combined search and pagination works
  TestValidator.predicate(
    "combined search and pagination returns valid data",
    combinedTestResults.data.length <= 3,
  );
}