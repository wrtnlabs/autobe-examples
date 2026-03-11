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
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_reports_moderator_queue_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member as community owner
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Add member as moderator to the community
  const moderatorRole =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      memberConnection,
      {
        communityId: community.id,
        userId: memberAuth.user.id,
      },
    );
  typia.assert(moderatorRole);
  // 4. Submit a report against content in the community
  // Using random valid UUIDs for reported content (simulating existing content)
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  const report = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "COMMENT" as const,
        reported_content_id: reportedContentId,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Call the queue endpoint to retrieve moderator reports
  const queueResponse =
    await api.functional.redditPlatform.member.reports.queue.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(queueResponse);
  // 6. Verify queue returns reports correctly
  TestValidator.equals(
    "queue has pending reports",
    queueResponse.data.length > 0,
    true,
  );
  TestValidator.equals(
    "queue pagination records count matches data",
    queueResponse.pagination.records,
    queueResponse.data.length,
  );
  TestValidator.equals(
    "queue pagination limit is default 20",
    queueResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "queue current page is 1",
    queueResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "queue pages calculated correctly",
    queueResponse.pagination.pages,
    1,
  );
  // 7. Verify report details in queue response
  const foundReport = queueResponse.data.find(
    (r) => r.reported_content_id === reportedContentId
  );
  TestValidator.notEquals(
    "queue returns submitted report",
    foundReport,
    undefined,
  );
  if (foundReport) {
    TestValidator.equals(
      "report type is COMMENT",
      foundReport.reported_content_type,
      "COMMENT",
    );
    TestValidator.equals(
      "report content id matches",
      foundReport.reported_content_id,
      reportedContentId,
    );
    TestValidator.equals(
      "report community matches",
      foundReport.community.id,
      community.id,
    );
    TestValidator.equals(
      "report status is PENDING",
      foundReport.status,
      "PENDING",
    );
    typia.assert(foundReport.reporter);
    TestValidator.equals(
      "report reporter matches member",
      foundReport.reporter.id,
      memberAuth.user.id,
    );
  }
  // 8. Verify reports are sorted by created_at ASC (oldest first)
  if (queueResponse.data.length > 1) {
    for (let i = 1; i < queueResponse.data.length; i++) {
      const prevCreatedAt = queueResponse.data[i - 1].created_at;
      const currCreatedAt = queueResponse.data[i].created_at;
      TestValidator.predicate(
        "queue reports sorted chronologically oldest first",
        () => prevCreatedAt <= currCreatedAt,
      );
    }
  }
}