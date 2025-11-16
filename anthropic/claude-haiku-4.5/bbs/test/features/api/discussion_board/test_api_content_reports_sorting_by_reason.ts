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
 * Validate sorting of content reports by reason category.
 *
 * This test verifies that the content reports API correctly sorts reports by
 * their violation reason category. Moderators need to efficiently review
 * reports organized by violation type to identify patterns and prioritize
 * moderation actions. The test authenticates as a moderator and retrieves
 * reports with sorting parameters to ensure:
 *
 * 1. Reports are properly sorted by reason in ascending order
 * 2. Reports are properly sorted by reason in descending order
 * 3. Sorting combines correctly with pagination parameters
 * 4. Sorting works with status filters
 * 5. Similar violation types are grouped together
 * 6. Sorting order is consistent across multiple requests
 *
 * Business workflow:
 *
 * - Moderator registers for system access
 * - Moderator authenticates to access moderation tools
 * - Moderator requests reports sorted by reason to focus on specific violation
 *   types
 * - System returns properly ordered results for efficient review
 */
export async function test_api_content_reports_sorting_by_reason(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderatorAuth);

  TestValidator.predicate(
    "moderator authentication successful",
    moderatorAuth.token !== null && moderatorAuth.token !== undefined,
  );

  // Step 2: Request reports sorted by reason in ascending order
  const ascendingOrderRequest = {
    page: 1,
    limit: 50,
    orderBy: "reason" as const,
    order: "asc" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const ascendingResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: ascendingOrderRequest,
      },
    );
  typia.assert(ascendingResults);

  // Step 3: Validate ascending order sorting by reason
  if (ascendingResults.data.length > 1) {
    const reasons = ascendingResults.data.map((r) => r.reason);
    const reasonOrder: Record<string, number> = {
      copyright_violation: 0,
      harassment: 1,
      offensive_language: 2,
      other: 3,
      personal_attack: 4,
      spam: 5,
      off_topic: 6,
    };

    for (let i = 0; i < reasons.length - 1; i++) {
      const currentOrder = reasonOrder[reasons[i]];
      const nextOrder = reasonOrder[reasons[i + 1]];
      TestValidator.predicate(
        `ascending order maintained between reason ${reasons[i]} and ${reasons[i + 1]}`,
        currentOrder <= nextOrder,
      );
    }
  }

  // Step 4: Request reports sorted by reason in descending order
  const descendingOrderRequest = {
    page: 1,
    limit: 50,
    orderBy: "reason" as const,
    order: "desc" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const descendingResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: descendingOrderRequest,
      },
    );
  typia.assert(descendingResults);

  // Step 5: Validate descending order sorting by reason
  if (descendingResults.data.length > 1) {
    const reasons = descendingResults.data.map((r) => r.reason);
    const reasonOrder: Record<string, number> = {
      copyright_violation: 0,
      harassment: 1,
      offensive_language: 2,
      other: 3,
      personal_attack: 4,
      spam: 5,
      off_topic: 6,
    };

    for (let i = 0; i < reasons.length - 1; i++) {
      const currentOrder = reasonOrder[reasons[i]];
      const nextOrder = reasonOrder[reasons[i + 1]];
      TestValidator.predicate(
        `descending order maintained between reason ${reasons[i]} and ${reasons[i + 1]}`,
        currentOrder >= nextOrder,
      );
    }
  }

  // Step 6: Test sorting with pagination parameters
  const sortWithPaginationRequest = {
    page: 1,
    limit: 10,
    orderBy: "reason" as const,
    order: "asc" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const paginatedResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: sortWithPaginationRequest,
      },
    );
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination metadata is present",
    paginatedResults.pagination !== null &&
      paginatedResults.pagination !== undefined,
  );

  TestValidator.equals(
    "page limit matches request",
    paginatedResults.pagination.limit,
    10,
  );

  // Step 7: Test sorting with status filter
  const sortWithFilterRequest = {
    page: 1,
    limit: 50,
    status: "pending_review" as const,
    orderBy: "reason" as const,
    order: "asc" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const filteredResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: sortWithFilterRequest,
      },
    );
  typia.assert(filteredResults);

  // Validate all filtered results have the expected status
  if (filteredResults.data.length > 0) {
    filteredResults.data.forEach((report) => {
      TestValidator.equals(
        `report status matches filter`,
        report.status,
        "pending_review",
      );
    });
  }

  // Step 8: Verify sorting consistency across multiple requests
  const consistencyCheck1: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          orderBy: "reason" as const,
          order: "asc" as const,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(consistencyCheck1);

  const consistencyCheck2: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          orderBy: "reason" as const,
          order: "asc" as const,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(consistencyCheck2);

  // Verify that the first page results are consistent
  if (consistencyCheck1.data.length > 0 && consistencyCheck2.data.length > 0) {
    const ids1 = consistencyCheck1.data.map((r) => r.id);
    const ids2 = consistencyCheck2.data.map((r) => r.id);

    TestValidator.equals(
      "sorting order is consistent across requests",
      ids1,
      ids2,
    );
  }

  // Step 9: Validate report structure in sorted results
  if (ascendingResults.data.length > 0) {
    const sampleReport = ascendingResults.data[0];

    TestValidator.predicate(
      "report has valid ID",
      sampleReport.id !== null && sampleReport.id !== undefined,
    );

    TestValidator.predicate(
      "report has reason category",
      sampleReport.reason !== null && sampleReport.reason !== undefined,
    );

    TestValidator.predicate(
      "report has status",
      sampleReport.status !== null && sampleReport.status !== undefined,
    );

    TestValidator.predicate(
      "report has creation timestamp",
      sampleReport.created_at !== null && sampleReport.created_at !== undefined,
    );

    TestValidator.predicate(
      "report has reporter information",
      sampleReport.reporter !== null && sampleReport.reporter !== undefined,
    );
  }
}
