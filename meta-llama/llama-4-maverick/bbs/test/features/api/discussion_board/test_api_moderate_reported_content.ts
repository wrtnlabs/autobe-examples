import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReportedContent";

export async function test_api_moderate_reported_content(
  connection: api.IConnection,
) {
  try {
    // Create a new moderator account for authentication
    const moderatorEmail = typia.random<string & tags.Format<"email">>();
    const moderator: IDiscussionBoardModerator.IAuthorized =
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: moderatorEmail,
          password: "1234",
          username: RandomGenerator.name(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    typia.assert(moderator);

    // Moderate reported content
    const reportedContentPage: IPageIDiscussionBoardReportedContent.ISummary =
      await api.functional.discussionBoard.moderator.reportedContent.searchReportedContent(
        connection,
        {
          body: typia.random<IDiscussionBoardReportedContent.IRequest>(),
        },
      );
    typia.assert(reportedContentPage);

    // Validate pagination information
    TestValidator.equals(
      "pagination exists",
      reportedContentPage.pagination !== null,
      true,
    );
    if (reportedContentPage.pagination) {
      TestValidator.predicate(
        "valid page count",
        reportedContentPage.pagination.pages >= 1,
      );
      TestValidator.predicate(
        "valid record count",
        reportedContentPage.pagination.records >= 0,
      );
    }

    // Check reported content data
    if (reportedContentPage.data.length > 0) {
      const firstReport = reportedContentPage.data[0];
      typia.assert(firstReport);
      // Add additional validation for reported content properties if needed
    }
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}
