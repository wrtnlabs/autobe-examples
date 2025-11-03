import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_report_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Use the returned token to authenticate the connection (SDK automatically manages headers)
  // No manual header modification - trust SDK transport

  // 3. Generate a random report ID for retrieval
  const reportId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the report using the generated report ID
  const retrievedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.at(connection, {
      reportId,
    });
  typia.assert(retrievedReport);

  // 5. Validate the structure of the retrieved report
  TestValidator.predicate(
    "report ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedReport.id,
    ),
  );
  TestValidator.predicate(
    "reported post ID is either UUID or null",
    retrievedReport.reported_post_id === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedReport.reported_post_id,
      ),
  );
  TestValidator.predicate(
    "reported comment ID is either UUID or null",
    retrievedReport.reported_comment_id === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedReport.reported_comment_id,
      ),
  );
  TestValidator.predicate(
    "actor type is either 'citizen' or 'moderator'",
    retrievedReport.actor_type === "citizen" ||
      retrievedReport.actor_type === "moderator",
  );
  TestValidator.predicate(
    "status is one of valid values",
    ["pending", "dismissed", "edited", "deleted"].includes(
      retrievedReport.status,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO datetime format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      retrievedReport.created_at,
    ),
  );

  // Note: complaint_reason is optional, so we don't validate its existence

  // Validate that response is not ambiguous -- typia.assert already did this
}
