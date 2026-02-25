import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { generate_random_reddit_member_communities_reports_create } from "../../../generate/generate_random_reddit_member_communities_reports_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";
import { prepare_random_reddit_report } from "../../../prepare/prepare_random_reddit_report";

export async function test_api_report_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secure_password_123",
      username: RandomGenerator.name(),
    },
  });
  // 2. Create community
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {},
  );
  // 3. Submit report
  const report = await generate_random_reddit_member_communities_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(report);
  // 4. Retrieve report
  const retrievedReport = await api.functional.reddit.member.reports.at(
    memberConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 5. Verify business details
  TestValidator.equals(
    "report status must be 'pending'",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "report reason must match",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "reporter ID must match",
    retrievedReport.reporter.id,
    report.reporter.id,
  );
  TestValidator.equals(
    "reporter email must match",
    retrievedReport.reporter.email,
    report.reporter.email,
  );
}
