import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPoliticalForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalForumPostReport";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";
import type { IPoliticalForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPostReport";

export async function test_api_moderator_report_search_by_status_and_date_range(
  connection: api.IConnection,
) {
  const admin: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
      } satisfies IPoliticalForumModerator.ICreate,
    });
  typia.assert(admin);

  // Generate a random request body with all optional fields filled to validate contract
  const request: IPoliticalForumPostReport.IRequest = {
    status: RandomGenerator.pick([
      "pending",
      "reviewed",
      "dismissed",
      "escalated",
    ] as const),
    created_after: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    created_before: new Date().toISOString(),
    page: 1,
    limit: 20,
    sort_by: "created_at",
    order: "desc",
  } satisfies IPoliticalForumPostReport.IRequest;

  const results: IPageIPoliticalForumPostReport.ISummary =
    await api.functional.politicalForum.moderator.reports.search(connection, {
      body: request,
    });
  typia.assert(results);

  // Validate response structure
  TestValidator.equals("pagination.page must be 1", results.pagination.page, 1);
  TestValidator.predicate(
    "pagination.pageSize between 1 and 500",
    results.pagination.pageSize >= 1 && results.pagination.pageSize <= 500,
  );
  TestValidator.predicate(
    "pagination.total >= 0",
    results.pagination.total >= 0,
  );
  TestValidator.predicate(
    "pagination.totalPages >= 0",
    results.pagination.totalPages >= 0,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(results.data),
  );

  // Validate that data items are correctly typed
  if (results.data.length > 0) {
    const firstReport = results.data[0];
    TestValidator.equals(
      "report_type must be post or comment",
      firstReport.report_type === "post" ||
        firstReport.report_type === "comment",
      true,
    );
    TestValidator.equals(
      "status must be one of the valid values",
      ["pending", "reviewed", "dismissed", "escalated"].includes(
        firstReport.status,
      ),
      true,
    );
    TestValidator.predicate(
      "created_at must be ISO string",
      typia.is<string & tags.Format<"date-time">>(firstReport.created_at),
    );
    TestValidator.predicate(
      "report_target_id must be uuid",
      typia.is<string & tags.Format<"uuid">>(firstReport.report_target_id),
    );
    TestValidator.predicate(
      "reporter_id must be uuid",
      typia.is<string & tags.Format<"uuid">>(firstReport.reporter_id),
    );
    TestValidator.predicate(
      "reason must be string and max 1000 chars",
      typeof firstReport.reason === "string" &&
        firstReport.reason.length <= 1000,
    );
  }

  // Validate decision_notes can be null, string, or undefined
  if (results.data.length > 0) {
    const decisionNotes = results.data[0].decision_notes;
    TestValidator.predicate(
      "decision_notes must be string or null or undefined",
      decisionNotes === null ||
        decisionNotes === undefined ||
        typeof decisionNotes === "string",
    );
    if (decisionNotes && typeof decisionNotes === "string") {
      TestValidator.predicate(
        "decision_notes max length 2000",
        decisionNotes.length <= 2000,
      );
    }
  }
}
