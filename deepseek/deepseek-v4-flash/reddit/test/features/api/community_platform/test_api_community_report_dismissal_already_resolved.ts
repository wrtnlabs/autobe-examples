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
 * Test that dismissing an already-dismissed community report is rejected with a 422 error.
 *
 * Validates the business rule that only reports in 'pending' status can be dismissed. An owner/moderator first dismisses a pending report successfully, transitioning it to 'dismissed' status. A subsequent attempt to dismiss the same report must fail because the status is no longer 'pending'.
 *
 * The community owner (Member A) creates a community, subscribes, and creates a post. Member B reports the post. Member A dismisses the report (first call succeeds), then attempts to dismiss the same report again (second call fails with 422).
 *
 * 1. Member A registers and creates a community.
 * 2. Member A subscribes to the community.
 * 3. Member A creates a text post in the community.
 * 4. Member B registers and reports the post.
 * 5. Member A dismisses the report (expected: 200 OK, status becomes "dismissed").
 * 6. Member A attempts to dismiss the same report again (expected: 422 Unprocessable Entity).
 */
export async function test_api_community_report_dismissal_already_resolved(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Member A: register and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A: create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A: subscribe to the community (required to create posts)
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 4. Member A: create a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: "Test post for report dismissal testing",
        body: "This post is created specifically for testing that dismissing an already-resolved report is rejected.",
      },
    },
  );
  typia.assert(post);
  // 5. Member B: register and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Member B: report the post
  const report =
    await generate_random_community_platform_member_community_reports_create(
      memberBConnection,
      {
        body: {
          targetId: post.id,
          targetType: "post",
          reason:
            "This post violates community guidelines and should be reviewed.",
        },
      },
    );
  typia.assert(report);
  // ---- First dismiss: should succeed ----
  const firstDismiss =
    await api.functional.communityPlatform.member.community_reports.dismiss(
      memberAConnection,
      { reportId: report.id },
    );
  typia.assert(firstDismiss);
  TestValidator.equals(
    "report status after first dismiss",
    firstDismiss.status,
    "dismissed",
  );
  // ---- Second dismiss: should fail with 422 ----
  await TestValidator.httpError(
    "dismiss already dismissed report",
    422,
    async () => {
      await api.functional.communityPlatform.member.community_reports.dismiss(
        memberAConnection,
        { reportId: report.id },
      );
    },
  );
}
