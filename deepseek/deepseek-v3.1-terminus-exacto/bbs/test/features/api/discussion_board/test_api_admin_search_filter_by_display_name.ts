import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_search_filter_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Test search with empty display name filter (should return all admins)
  const allAdminsResult = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(allAdminsResult);
  // If there are administrators in the system, test filtering
  if (allAdminsResult.data.length > 0) {
    const targetAdmin = allAdminsResult.data[0]!;
    // Test exact match filtering
    const exactMatchResult = await api.functional.discussionBoard.admins.index(
      adminConnection,
      {
        body: {
          display_name: targetAdmin.display_name,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
    typia.assert(exactMatchResult);
    // Verify exact match returns the matching administrator
    TestValidator.predicate(
      "exact match should return at least one admin",
      exactMatchResult.data.length >= 1,
    );
    TestValidator.equals(
      "exact match should include target admin",
      exactMatchResult.data.some((admin) => admin.id === targetAdmin.id),
      true,
    );
    // Test partial match at the beginning
    const partialStart = targetAdmin.display_name.substring(0, 3);
    const partialStartResult =
      await api.functional.discussionBoard.admins.index(adminConnection, {
        body: {
          display_name: partialStart,
        } satisfies IDiscussionBoardAdmin.IRequest,
      });
    typia.assert(partialStartResult);
    // Verify partial match returns administrators containing the substring
    TestValidator.predicate(
      "partial start match should return at least one admin",
      partialStartResult.data.length >= 1,
    );
    TestValidator.predicate(
      "all returned admins should contain partial string",
      partialStartResult.data.every((admin) =>
        admin.display_name.toLowerCase().includes(partialStart.toLowerCase()),
      ),
    );
    // Test case-insensitive filtering
    const uppercaseName = targetAdmin.display_name.toUpperCase();
    const caseInsensitiveResult =
      await api.functional.discussionBoard.admins.index(adminConnection, {
        body: {
          display_name: uppercaseName,
        } satisfies IDiscussionBoardAdmin.IRequest,
      });
    typia.assert(caseInsensitiveResult);
    // Case-insensitive should still match
    TestValidator.predicate(
      "case-insensitive search should return matching admin",
      caseInsensitiveResult.data.length >= 1,
    );
    TestValidator.equals(
      "case-insensitive search should include target admin",
      caseInsensitiveResult.data.some((admin) => admin.id === targetAdmin.id),
      true,
    );
    // Test pagination with filtering
    const paginatedResult = await api.functional.discussionBoard.admins.index(
      adminConnection,
      {
        body: {
          display_name: partialStart,
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
    typia.assert(paginatedResult);
    // Verify pagination metadata
    TestValidator.predicate(
      "pagination current page should be valid",
      paginatedResult.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit should be respected",
      paginatedResult.data.length <= 2,
    );
    TestValidator.predicate(
      "pagination records should reflect filtered count",
      paginatedResult.pagination.records >= partialStartResult.data.length,
    );
  } else {
    // Test with non-existent display name when no admins exist
    const nonExistentResult = await api.functional.discussionBoard.admins.index(
      adminConnection,
      {
        body: {
          display_name: "NonExistentAdminName123",
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
    typia.assert(nonExistentResult);
    // Should return empty results for non-existent name
    TestValidator.equals(
      "non-existent display name should return empty results",
      nonExistentResult.data.length,
      0,
    );
  }
}