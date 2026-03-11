import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderation_queue_view_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator member and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  typia.assert(moderatorAuth.user);
  // 2. Setup: Create a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Setup: Assign moderator to the community
  await generate_random_reddit_platform_member_communities_moderators_create(
    moderatorConnection,
    {
      params: { communityId: community.id },
      body: { user_id: moderatorAuth.user.id },
    },
  );
  // 4. Setup: Create reporter member and authenticate
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporterAuth);
  typia.assert(reporterAuth.user);
  // 5. Create a dummy report with mock content_id (test environment should have content)
  // Note: In production, this would require valid reported_content_id that exists
  const report1 = await generate_random_reddit_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "COMMENT",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason:
          "This is a test report for moderation queue testing purposes with enough characters",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  // 6. Create second reporter and another report
  const secondReporterConnection: api.IConnection = { host: connection.host };
  const secondReporterAuth = await authorize_member_join(
    secondReporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(secondReporterAuth);
  typia.assert(secondReporterAuth.user);
  const report2 = await generate_random_reddit_platform_member_reports_create(
    secondReporterConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "COMMENT",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason:
          "Another test report to verify multiple reports in queue for comprehensive testing",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  // 7. Execute: Call moderation queue endpoint
  const queueResponse =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(queueResponse);
  // 8. Validate: Response structure
  TestValidator.equals(
    "queue response has pagination",
    queueResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "queue response has data array",
    Array.isArray(queueResponse.data),
    true,
  );
  // 9. Validate: All reports are PENDING status
  for (const report of queueResponse.data) {
    TestValidator.equals("report status is PENDING", report.status, "PENDING");
    TestValidator.equals(
      "report belongs to correct community",
      report.community.id,
      community.id,
    );
  }
  // 10. Validate: Reports are sorted by created_at DESC (newest first)
  if (queueResponse.data.length > 1) {
    for (let i = 0; i < queueResponse.data.length - 1; i++) {
      const prevDate = new Date(queueResponse.data[i].created_at).getTime();
      const nextDate = new Date(queueResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "reports sorted by created_at DESC",
        prevDate >= nextDate,
      );
    }
  }
  // 11. Validate: Pagination metadata is correct
  TestValidator.equals(
    "current page is 1",
    queueResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count matches data length",
    queueResponse.pagination.records,
    queueResponse.data.length,
  );
  TestValidator.equals(
    "pages calculated correctly",
    queueResponse.pagination.pages,
    Math.ceil(
      queueResponse.pagination.records / queueResponse.pagination.limit,
    ),
  );
}
