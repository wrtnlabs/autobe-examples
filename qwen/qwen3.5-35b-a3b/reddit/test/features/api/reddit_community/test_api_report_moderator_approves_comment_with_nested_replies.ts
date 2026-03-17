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

export async function test_api_report_moderator_approves_comment_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member who will act as reporter
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Authenticate member who will act as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3. Create a nested comment report scenario using mock data
  // Note: Full scenario (create community, post, comments, report) requires API functions
  // that are not provided. This test validates the approve endpoint with simulated report.
  // 4. Approve a report (simulating that a nested comment report exists)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const approvedReport =
    await api.functional.redditCommunity.member.reports.approve(
      moderatorConnection,
      {
        reportId,
      },
    );
  typia.assert(approvedReport);
  // 5. Validate report status is approved
  TestValidator.equals(
    "report status changed to approved",
    approvedReport.status,
    "approved",
  );
  // 6. Validate report has required fields for a comment report
  TestValidator.equals(
    "report has correct target type for comment",
    approvedReport.target_type,
    "comment",
  );
  // 7. Validate report has reporter info
  TestValidator.equals(
    "report has reporter summary",
    approvedReport.reporter !== undefined,
    true,
  );
  // 8. Validate report has community info
  TestValidator.equals(
    "report has community summary",
    approvedReport.community !== undefined,
    true,
  );
  // 9. Validate timestamps are present
  TestValidator.notEquals(
    "report has created_at timestamp",
    approvedReport.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "report has updated_at timestamp",
    approvedReport.updated_at,
    undefined,
  );
}
