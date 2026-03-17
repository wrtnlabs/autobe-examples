import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismissal_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random report ID for testing the dismiss endpoint
  // Note: Full workflow requires community/post/comment creation APIs that are not available
  // This test focuses on verifying the dismiss endpoint behavior
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Authenticate as a member (simulating moderator role)
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Call the dismiss endpoint with the generated report ID
  const dismissedReport =
    await api.functional.redditCommunity.member.reports.dismiss(
      moderatorConnection,
      {
        reportId,
      },
    );
  typia.assert(dismissedReport);
  // Verify the response is a valid report entity with status field
  TestValidator.equals(
    "response contains valid status field",
    typeof dismissedReport.status,
    "string",
  );
  // Verify report_id is preserved in response
  TestValidator.equals(
    "report_id matches request",
    dismissedReport.id,
    reportId,
  );
  // Verify report has required properties
  TestValidator.notEquals(
    "report has reporter information",
    dismissedReport.reporter, // Should not be null/undefined
    null,
  );
  TestValidator.notEquals(
    "report has community information",
    dismissedReport.community,
    null,
  );
  // Verify timestamps are valid ISO format
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !Number.isNaN(Date.parse(dismissedReport.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !Number.isNaN(Date.parse(dismissedReport.updated_at)),
  );
  // Verify updated_at is not null
  TestValidator.predicate(
    "updated_at is not null",
    dismissedReport.updated_at !== null,
  );
  // Verify created_at is not null
  TestValidator.predicate(
    "created_at is not null",
    dismissedReport.created_at !== null,
  );
  // Verify reporter has required fields
  TestValidator.notEquals("reporter has id", dismissedReport.reporter.id, null);
  TestValidator.notEquals(
    "reporter has username",
    dismissedReport.reporter.username,
    null,
  );
  // Verify community has required fields
  TestValidator.notEquals(
    "community has id",
    dismissedReport.community.id,
    null,
  );
  TestValidator.notEquals(
    "community has name",
    dismissedReport.community.name,
    null,
  );
  // Verify target_type is valid enum value
  TestValidator.predicate(
    "target_type is valid enum",
    dismissedReport.target_type === "post" ||
      dismissedReport.target_type === "comment",
  );
  // Verify target_id is valid UUID format
  TestValidator.predicate(
    "target_id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      dismissedReport.target_id,
    ),
  );
  // Verify reason is a non-empty string
  TestValidator.predicate(
    "reason is non-empty string",
    dismissedReport.reason !== "" && typeof dismissedReport.reason === "string",
  );
  // Verify deleted_at is null for active reports
  TestValidator.predicate(
    "deleted_at is null for active report",
    dismissedReport.deleted_at === null,
  );
}
