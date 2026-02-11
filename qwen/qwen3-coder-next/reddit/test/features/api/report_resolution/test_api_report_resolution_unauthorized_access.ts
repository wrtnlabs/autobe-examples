import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_reddit_platform_report_resolutions_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_report_resolutions_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";
import { prepare_random_reddit_platform_report_resolution } from "../../../prepare/prepare_random_reddit_platform_report_resolution";

export async function test_api_report_resolution_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Regular member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a report for some content
  const report: IRedditPlatformReport =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "POST",
          reported_id: RandomGenerator.alphaNumeric(36),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // Step 3: Attempt to resolve the report as a regular member (should fail)
  await TestValidator.error(
    "regular member cannot resolve report",
    async () => {
      await api.functional.redditPlatform.member.redditPlatform.reportResolutions.create(
        memberConnection,
        {
          body: {
            report_id: report.id,
            status: "RESOLVED",
            resolution_notes: "Test resolution attempt by unauthorized user",
          } satisfies IRedditPlatformReportResolution.ICreate,
        },
      );
    },
  );
}
