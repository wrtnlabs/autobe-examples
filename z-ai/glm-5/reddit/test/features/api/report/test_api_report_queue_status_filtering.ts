import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_queue_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member account (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  // 3. Subscribe moderator to community
  await generate_random_community_platform_member_subscriptions_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  // 5. Create second member account (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  // 6. Second member subscribes to community
  await generate_random_community_platform_member_subscriptions_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 7. Second member reports the post (creates pending report)
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        communityId: community.id,
        postId: post.id,
      },
    },
  );
  typia.assert(report);
  // Test 1: No status filter (should default to pending)
  const pendingReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "default filter returns pending reports",
    pendingReports.data.length > 0,
  );
  TestValidator.equals(
    "report status is pending",
    pendingReports.data[0].status,
    "pending",
  );
  // Test 2: Filter by status='approved' (should return empty list)
  const approvedReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
          status: "approved",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.equals("no approved reports", approvedReports.data.length, 0);
  // Test 3: Filter by status='dismissed' (should return empty list)
  const dismissedReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
          status: "dismissed",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.equals("no dismissed reports", dismissedReports.data.length, 0);
}
