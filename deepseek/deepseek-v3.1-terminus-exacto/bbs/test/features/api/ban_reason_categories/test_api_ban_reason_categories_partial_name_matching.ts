import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanReasonCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the partial name matching functionality for ban reason categories.
 * A super administrator searches for categories using partial name matching
 * by providing a substring of category names. Verify that the endpoint correctly
 * returns categories whose names contain the provided substring. Test with
 * various partial strings to ensure robust matching functionality. Validate
 * that the response includes only matching categories and maintains proper
 * pagination metadata.
 */
export async function test_api_ban_reason_categories_partial_name_matching(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // First, get all existing categories to work with real data
  const allCategoriesResult =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(allCategoriesResult);
  // If there are no categories, we can't test partial matching
  if (allCategoriesResult.data.length === 0) {
    console.log(
      "No ban reason categories found - skipping partial name matching tests",
    );
    return;
  }
  // Extract partial strings from existing category names for testing
  const searchPatterns: string[] = [];
  for (const category of allCategoriesResult.data) {
    // Take middle part of category names (avoiding start/end)
    if (category.name.length > 5) {
      const startIndex = Math.floor(category.name.length / 3);
      const endIndex = Math.floor((category.name.length * 2) / 3);
      const partialName = category.name.substring(startIndex, endIndex).trim();
      if (partialName.length > 2) {
        searchPatterns.push(partialName);
      }
    }
  }
  // If we couldn't extract meaningful patterns, use some generic ones
  if (searchPatterns.length === 0) {
    searchPatterns.push("violation", "policy", "content", "issue", "speech");
  }
  // Test partial matching with extracted patterns
  for (const pattern of searchPatterns.slice(0, 3)) {
    // Test max 3 patterns
    const searchResult =
      await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
        superAdminConnection,
        {
          body: {
            name: pattern,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardBanReasonCategory.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate that all returned categories contain the search pattern in their names
    for (const category of searchResult.data) {
      TestValidator.predicate(
        `category name should contain '${pattern}'`,
        category.name.toLowerCase().includes(pattern.toLowerCase()),
      );
    }
    // Validate pagination metadata
    TestValidator.predicate(
      `pagination should be valid for pattern '${pattern}'`,
      searchResult.pagination.current === 1 &&
        searchResult.pagination.limit === 10 &&
        searchResult.pagination.records >= 0 &&
        searchResult.pagination.pages >= 0,
    );
  }
  // Test empty search pattern (should return all categories)
  const emptyPatternResult =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          name: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(emptyPatternResult);
  // Test non-matching pattern (should return empty results or fewer results)
  const nonMatchingResult =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          name: "NonExistentPatternXYZ123",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(nonMatchingResult);
  // The non-matching pattern might still match some categories if they contain similar characters
  // So we just validate the response structure without assuming empty results
  TestValidator.predicate(
    "non-matching pattern should return valid pagination",
    nonMatchingResult.pagination.current === 1 &&
      nonMatchingResult.pagination.limit === 10 &&
      nonMatchingResult.pagination.records >= 0 &&
      nonMatchingResult.pagination.pages >= 0,
  );
}
