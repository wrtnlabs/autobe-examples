import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import type { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_member_report_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Generate consistent report body for duplicate test
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  const reportBody = {
    community_id: communityId,
    reported_content_type: "POST" as const,
    reported_content_id: reportedContentId,
    reason: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IRedditPlatformReport.ICreate;
  // Submit first report using utility function
  const firstReport =
    await generate_random_reddit_platform_member_reports_create(
      memberConnection,
      {
        body: reportBody,
      },
    );
  const firstReportSummary: IRedditPlatformReport.ISummary = typia.assert(
    firstReport as unknown as IRedditPlatformReport.ISummary,
  );
  TestValidator.equals(
    "first report created",
    firstReportSummary.status,
    "PENDING",
  );
  // Attempt duplicate report - should fail
  await TestValidator.error("duplicate report prevention", async () => {
    await generate_random_reddit_platform_member_reports_create(
      memberConnection,
      {
        body: reportBody,
      },
    );
  });
  // Test that different content items can be reported
  const differentReportBody = {
    ...reportBody,
    reported_content_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditPlatformReport.ICreate;
  const secondReport =
    await generate_random_reddit_platform_member_reports_create(
      memberConnection,
      {
        body: differentReportBody,
      },
    );
  const secondReportSummary: IRedditPlatformReport.ISummary = typia.assert(
    secondReport as unknown as IRedditPlatformReport.ISummary,
  );
  TestValidator.equals(
    "different content report allowed",
    secondReportSummary.status,
    "PENDING",
  );
}
