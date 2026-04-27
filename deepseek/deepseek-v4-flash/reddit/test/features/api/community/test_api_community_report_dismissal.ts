import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_community_reports_create } from "../../../generate/generate_random_community_platform_member_community_reports_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_community_report } from "../../../prepare/prepare_random_community_platform_community_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test the moderator report dismissal workflow where a pending report is reviewed and dismissed.
 *
 * This test validates that when a moderator dismisses a community report, the report's status transitions from 'pending' to 'dismissed', the `updated_at` timestamp is refreshed, and crucially, the targeted content remains unchanged — dismissing a report does not delete the reported post.
 *
 * The workflow involves two members: one acts as the community owner/moderator who creates the community, and the other acts as a member who subscribes, creates a post, and reports that post. The moderator then dismisses the report.
 *
 * 1. Member A registers and creates a community (becoming its owner/moderator).
 * 2. Member B registers, subscribes to the community, and creates a text post.
 * 3. Member B reports their own post with a textual reason.
 * 4. Member A (moderator) calls the update endpoint with status='dismissed'.
 * 5. Validates the report's status is 'dismissed', updated_at changed, and the post still exists.
 */
export async function test_api_community_report_dismissal(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Member A: register as community owner/moderator
  //----
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  //----
  // 2. Member A creates a community
  //----
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  //----
  // 3. Member B: register as reporter
  //----
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  //----
  // 4. Member B subscribes to the community
  //----
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  //----
  // 5. Member B creates a text post in the community
  //----
  const post = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  //----
  // 6. Member B reports their own post
  //----
  const report =
    await generate_random_community_platform_member_community_reports_create(
      memberBConnection,
      {
        body: {
          targetId: post.id,
          targetType: "post" as const,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  //----
  // 7. Member A (moderator) dismisses the report
  //----
  const dismissedReport =
    await api.functional.communityPlatform.member.community_reports.update(
      memberAConnection,
      {
        reportId: report.id,
        body: {
          status: "dismissed",
        } satisfies ICommunityPlatformCommunityReport.IUpdate,
      },
    );
  typia.assert(dismissedReport);
  //----
  // 8. Validate the dismissal
  //----
  TestValidator.equals(
    "report status changed to dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.notEquals(
    "updated_at refreshed after dismissal",
    dismissedReport.updated_at,
    report.updated_at,
  );
  TestValidator.equals(
    "community remains the same",
    dismissedReport.community.id,
    community.id,
  );
}
