import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test sorting content reports by status field.
 *
 * Validates that the content reports API correctly sorts reports by their
 * status field (pending_review, resolved, dismissed). The moderator
 * authenticates first and then requests reports with different status-based
 * sorting parameters to ensure results are properly ordered.
 *
 * Test steps:
 *
 * 1. Moderator registration and authentication
 * 2. Request reports sorted by status in ascending order
 * 3. Validate ascending sort groups reports by status correctly
 * 4. Request reports sorted by status in descending order
 * 5. Validate descending sort results are different from ascending
 * 6. Test sorting combined with pagination
 * 7. Verify all report statuses are valid enum values
 */
export async function test_api_content_reports_sorting_by_status(
  connection: api.IConnection,
) {
  // Step 1: Moderator registration and authentication
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request reports sorted by status in ascending order
  const ascendingSortResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "status",
          order: "asc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(ascendingSortResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page is positive",
    ascendingSortResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    ascendingSortResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    ascendingSortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    ascendingSortResult.pagination.pages >= 0,
  );

  // Step 3: Validate ascending sort groups reports by status correctly
  const validStatuses: ("pending_review" | "resolved" | "dismissed")[] = [
    "pending_review",
    "resolved",
    "dismissed",
  ];

  for (const report of ascendingSortResult.data) {
    TestValidator.predicate(
      "report status is valid enum value",
      validStatuses.includes(report.status),
    );
  }

  // Verify ascending sort order
  const statusOrder = { pending_review: 0, resolved: 1, dismissed: 2 };
  if (ascendingSortResult.data.length > 1) {
    for (let i = 1; i < ascendingSortResult.data.length; i++) {
      const prevStatus = ascendingSortResult.data[i - 1].status;
      const currStatus = ascendingSortResult.data[i].status;
      TestValidator.predicate(
        "ascending sort maintains status order",
        statusOrder[prevStatus as keyof typeof statusOrder] <=
          statusOrder[currStatus as keyof typeof statusOrder],
      );
    }
  }

  // Step 4: Request reports sorted by status in descending order
  const descendingSortResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "status",
          order: "desc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(descendingSortResult);

  // Step 5: Validate descending sort results are different from ascending
  if (descendingSortResult.data.length > 1) {
    for (let i = 1; i < descendingSortResult.data.length; i++) {
      const prevStatus = descendingSortResult.data[i - 1].status;
      const currStatus = descendingSortResult.data[i].status;
      TestValidator.predicate(
        "descending sort maintains reverse status order",
        statusOrder[prevStatus as keyof typeof statusOrder] >=
          statusOrder[currStatus as keyof typeof statusOrder],
      );
    }
  }

  // Verify ascending and descending produce different orderings when multiple reports exist
  if (
    ascendingSortResult.data.length > 1 &&
    descendingSortResult.data.length > 1
  ) {
    const ascendingFirstStatus = ascendingSortResult.data[0].status;
    const descendingFirstStatus = descendingSortResult.data[0].status;

    const statusPriority = { pending_review: 0, resolved: 1, dismissed: 2 };
    const ascPriority =
      statusPriority[ascendingFirstStatus as keyof typeof statusPriority];
    const descPriority =
      statusPriority[descendingFirstStatus as keyof typeof statusPriority];

    TestValidator.predicate(
      "ascending starts with lower status priority than descending",
      ascPriority <= descPriority,
    );
  }

  // Step 6: Test sorting combined with pagination
  const paginatedSortResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "status",
          order: "asc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(paginatedSortResult);

  TestValidator.equals(
    "pagination limit matches requested limit",
    paginatedSortResult.pagination.limit,
    10,
  );

  // Verify paginated results also maintain sort order
  if (paginatedSortResult.data.length > 1) {
    for (let i = 1; i < paginatedSortResult.data.length; i++) {
      const prevStatus = paginatedSortResult.data[i - 1].status;
      const currStatus = paginatedSortResult.data[i].status;
      TestValidator.predicate(
        "paginated results maintain status sort order",
        statusOrder[prevStatus as keyof typeof statusOrder] <=
          statusOrder[currStatus as keyof typeof statusOrder],
      );
    }
  }

  // Step 7: Verify sort stability with multiple reports having same status
  const sortedByStatus: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          orderBy: "status",
          order: "asc",
          limit: 100,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(sortedByStatus);

  // Verify all statuses in response are valid
  for (const report of sortedByStatus.data) {
    TestValidator.predicate(
      "all report statuses are valid enum values",
      validStatuses.includes(report.status),
    );
  }

  // Verify sort order is maintained throughout the entire result set
  if (sortedByStatus.data.length > 1) {
    for (let i = 1; i < sortedByStatus.data.length; i++) {
      const prevStatus = sortedByStatus.data[i - 1].status;
      const currStatus = sortedByStatus.data[i].status;
      TestValidator.predicate(
        "entire result set maintains status sort order",
        statusOrder[prevStatus as keyof typeof statusOrder] <=
          statusOrder[currStatus as keyof typeof statusOrder],
      );
    }
  }
}
