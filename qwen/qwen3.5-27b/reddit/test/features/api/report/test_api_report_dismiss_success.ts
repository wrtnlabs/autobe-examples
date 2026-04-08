import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test successful dismissal of a pending moderation report by a moderator.
 *
 * Validates the report dismissal endpoint by authenticating a moderator and dismissing a report. Ensures that the dismiss operation returns a properly structured response with the report status changed to 'dismissed' and the deleted_at timestamp set to remove it from active moderation queues.
 *
 * Special attention is given to verifying the response structure contains all required report fields including the updated status, timestamps, and preserved report metadata.
 *
 * 1. Moderator registers and authenticates with unique credentials.
 * 2. Moderator dismisses a pending report using the dismiss endpoint.
 * 3. Validates report status changed to 'dismissed'.
 * 4. Validates deleted_at timestamp is set (not null).
 * 5. Validates updated_at timestamp is recorded.
 * 6. Validates all report fields are preserved in response.
 */
export async function test_api_report_dismiss_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Generate a valid report ID for testing
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Moderator dismisses the report
  const dismissedReport =
    await api.functional.redditClone.moderator.reports.dismiss(
      moderatorConnection,
      {
        reportId: reportId,
      },
    );
  typia.assert(dismissedReport);
  // 4. Validate dismissal results
  TestValidator.equals(
    "report status changed to dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    dismissedReport.deleted_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    dismissedReport.updated_at !== null,
  );
  TestValidator.predicate(
    "report type is valid",
    dismissedReport.report_type === "post" ||
      dismissedReport.report_type === "comment",
  );
  TestValidator.predicate(
    "report reason is preserved",
    dismissedReport.reason.length > 0,
  );
  TestValidator.predicate(
    "reporter information exists",
    dismissedReport.reporter.id !== null &&
      dismissedReport.reporter.id !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    dismissedReport.created_at !== null,
  );
  // 5. Validate discriminator logic (one of reportedPost or reportedComment should be set)
  const hasReportedPost =
    dismissedReport.reportedPost !== null &&
    dismissedReport.reportedPost !== undefined;
  const hasReportedComment =
    dismissedReport.reportedComment !== null &&
    dismissedReport.reportedComment !== undefined;
  TestValidator.predicate(
    "exactly one content type is reported",
    (hasReportedPost && !hasReportedComment) ||
      (!hasReportedPost && hasReportedComment),
  );
  // 6. Validate timestamps are in valid format
  TestValidator.predicate(
    "deleted_at is valid ISO datetime",
    !isNaN(Date.parse(dismissedReport.deleted_at!)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(dismissedReport.updated_at)),
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(dismissedReport.created_at)),
  );
}
