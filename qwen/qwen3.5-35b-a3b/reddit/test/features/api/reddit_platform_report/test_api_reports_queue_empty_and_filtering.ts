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

export async function test_api_reports_queue_empty_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test the moderation queue filtering for reports including empty queue scenarios
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
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
  typia.assert(authorized);
  // 2. Create community and add member as moderator
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Add member as moderator to the community
  await api.functional.redditPlatform.member.communities.moderators.addModerator(
    memberConnection,
    {
      communityId: community.id,
      userId: authorized.id,
    },
  );
  // 3. Test empty queue scenario (no reports exist yet)
  const emptyQueueConnection: api.IConnection = { host: connection.host };
  const emptyQueueResult =
    await api.functional.redditPlatform.member.reports.queue.index(
      emptyQueueConnection,
      {
        body: {
          status: "pending",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(emptyQueueResult);
  // Validate empty queue response
  TestValidator.equals(
    "empty queue data array",
    emptyQueueResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty queue pagination records",
    emptyQueueResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty queue pagination pages",
    emptyQueueResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty queue pagination current",
    emptyQueueResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty queue pagination limit",
    emptyQueueResult.pagination.limit,
    100,
  );
  // 4. Test filtering with status parameter - pending reports
  // First submit a report to have content for filtering
  const report = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Test pending status filter
  const pendingQueueResult =
    await api.functional.redditPlatform.member.reports.queue.index(
      memberConnection,
      {
        body: {
          status: "pending",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(pendingQueueResult);
  TestValidator.equals(
    "pending queue data array",
    pendingQueueResult.data.length,
    1,
  );
  TestValidator.equals(
    "pending queue has 1 record",
    pendingQueueResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "pending queue has 1 page",
    pendingQueueResult.pagination.pages,
    1,
  );
  // Verify the pending report matches submitted report
  const pendingReport = pendingQueueResult.data[0];
  typia.assertGuard(pendingReport);
  TestValidator.equals(
    "pending report status",
    pendingReport.status,
    "PENDING",
  );
  // 5. Test resolved status filter (should return empty when no resolved reports)
  const resolvedQueueResult =
    await api.functional.redditPlatform.member.reports.queue.index(
      memberConnection,
      {
        body: {
          status: "resolved",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(resolvedQueueResult);
  TestValidator.equals(
    "resolved queue data array",
    resolvedQueueResult.data.length,
    0,
  );
  TestValidator.equals(
    "resolved queue records",
    resolvedQueueResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "resolved queue pages",
    resolvedQueueResult.pagination.pages,
    0,
  );
}
