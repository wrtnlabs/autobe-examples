import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test the moderator report listing with status filtering.
 * A moderator should be able to filter reports by their resolution status
 * (pending, approved, or dismissed).
 */
export async function test_api_moderator_report_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create moderator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_moderator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    },
  });
  // Create multiple posts and comments with reports
  const reportIds: {
    postId?: string;
    commentId?: string;
  }[] = [];
  // Since posts and comments creation endpoints don't exist in the provided SDK,
  // we'll use the index endpoint to create initial report data by filtering with different status values
  // This approach simulates having reports in different statuses
  // First, create a report by attempting to fetch reports (the mock server will create some default reports)
  // Since we can't directly create reports, we'll rely on the mock server state
  // Filter by pending status to see what reports exist
  const initialPendingReports =
    await api.functional.redditClone.moderator.reports.index(adminConnection, {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(initialPendingReports);
  // Store the initial report count
  const initialPendingCount = initialPendingReports.data.length;
  // Test filtering by status with different status values
  // Filter by pending status
  const pendingReports =
    await api.functional.redditClone.moderator.reports.index(adminConnection, {
      body: {
        status: "pending",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(pendingReports);
  // Verify the reports are in the pending list
  TestValidator.equals(
    "pending report count matches initial count",
    pendingReports.data.length,
    initialPendingCount,
  );
  TestValidator.predicate("all pending reports have pending status", () =>
    pendingReports.data.every((r) => r.status === "pending"),
  );
  // Filter by approved status
  const approvedReports =
    await api.functional.redditClone.moderator.reports.index(adminConnection, {
      body: {
        status: "approved",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(approvedReports);
  // Filter by dismissed status
  const dismissedReports =
    await api.functional.redditClone.moderator.reports.index(adminConnection, {
      body: {
        status: "dismissed",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(dismissedReports);
  // Test pagination parameters
  const paginatedReports =
    await api.functional.redditClone.moderator.reports.index(adminConnection, {
      body: {
        status: "pending",
        page: 1,
        limit: 5,
      },
    });
  typia.assert(paginatedReports);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    () =>
      paginatedReports.pagination !== null &&
      typeof paginatedReports.pagination === "object",
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedReports.pagination.limit,
    5,
  );
  // Test with different page numbers
  const page2Reports = await api.functional.redditClone.moderator.reports.index(
    adminConnection,
    {
      body: {
        status: "pending",
        page: 2,
        limit: 5,
      },
    },
  );
  typia.assert(page2Reports);
  // Test with search parameter
  const searchReports =
    await api.functional.redditClone.moderator.reports.index(adminConnection, {
      body: {
        status: "pending",
        search: "spam",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(searchReports);
  // Test with content_type parameter
  const contentTypeReports =
    await api.functional.redditClone.moderator.reports.index(adminConnection, {
      body: {
        status: "pending",
        content_type: "post",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(contentTypeReports);
  // Verify that each report has expected structure
  TestValidator.predicate("all reports have required properties", () =>
    pendingReports.data.every(
      (r) =>
        r.id !== undefined &&
        r.reporter !== undefined &&
        r.content !== undefined &&
        r.status !== undefined &&
        r.created_at !== undefined,
    ),
  );
  // Verify reporter structure
  TestValidator.predicate("all reporters have required properties", () =>
    pendingReports.data.every(
      (r) =>
        r.reporter !== undefined &&
        r.reporter.id !== undefined &&
        r.reporter.username !== undefined,
    ),
  );
  // Verify content structure
  TestValidator.predicate("all content objects have required properties", () =>
    pendingReports.data.every(
      (r) =>
        r.content !== undefined &&
        r.content.type !== undefined &&
        r.content.id !== undefined &&
        r.content.titleOrContent !== undefined,
    ),
  );
  // Test sorting by created_at (newest first)
  TestValidator.predicate("reports are sorted by created_at descending", () => {
    const timestamps = pendingReports.data.map((r) =>
      new Date(r.created_at).getTime(),
    );
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] > timestamps[i - 1]) {
        return false;
      }
    }
    return timestamps.length <= 1;
  });
}
