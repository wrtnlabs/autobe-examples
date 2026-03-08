import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_dismissal_already_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community (Member A becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Create Member B (post author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Subscribe Member B to the community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    memberBConnection,
    { body: { community_id: community.id } },
  );
  // 5. Create a post as Member B
  const post = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Create Member C (reporter)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 7. Create a report on Member B's post
  const report = await generate_random_community_platform_member_reports_create(
    memberCConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        communityId: community.id,
        postId: post.id,
      },
    },
  );
  typia.assert(report);
  // Verify initial report status is 'pending'
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  // 8. First dismissal - should succeed (Member A is community owner)
  const dismissedReport =
    await api.functional.communityPlatform.member.reports.dismiss(
      memberAConnection,
      { reportId: report.id },
    );
  typia.assert(dismissedReport);
  // Verify report status is now 'dismissed'
  TestValidator.equals(
    "report status after first dismissal",
    dismissedReport.status,
    "dismissed",
  );
  // 9. Second dismissal attempt - should fail with HTTP 400
  await TestValidator.httpError(
    "second dismissal should fail",
    400,
    async () => {
      await api.functional.communityPlatform.member.reports.dismiss(
        memberAConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
