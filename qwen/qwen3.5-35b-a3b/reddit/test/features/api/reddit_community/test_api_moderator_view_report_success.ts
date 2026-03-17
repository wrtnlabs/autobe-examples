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

export async function test_api_moderator_view_report_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (fixtures ensure user is moderator of community)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Prepare and create a test report
  const community_id = typia.random<string & tags.Format<"uuid">>();
  const target_type = RandomGenerator.pick([
    "post" as const,
    "comment" as const,
  ]);
  const target_id = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const report = await api.functional.redditCommunity.member.reports.create(
    memberConnection,
    {
      body: {
        community_id,
        target_type,
        target_id,
        reason,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 3. Retrieve the report
  const retrievedReport =
    await api.functional.redditCommunity.member.reports.at(memberConnection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);
  // 4. Validate response contains all required fields
  TestValidator.equals("report ID", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter id",
    retrievedReport.reporter.id,
    memberAuth.token.access ?? "",
  );
  TestValidator.equals("target type", retrievedReport.target_type, target_type);
  TestValidator.equals("target ID", retrievedReport.target_id, target_id);
  TestValidator.equals("reason", retrievedReport.reason, reason);
  TestValidator.equals("status", retrievedReport.status, "pending");
  TestValidator.equals(
    "created_at",
    retrievedReport.created_at,
    report.created_at,
  );
  TestValidator.equals(
    "updated_at",
    retrievedReport.updated_at,
    report.updated_at,
  );
  TestValidator.equals("deleted_at", retrievedReport.deleted_at, null);
  TestValidator.equals(
    "reporter username",
    retrievedReport.reporter.username,
    memberConnection.headers?.Authorization ? "mock" : "",
  );
  TestValidator.equals(
    "community ID",
    retrievedReport.community.id,
    community_id,
  );
}