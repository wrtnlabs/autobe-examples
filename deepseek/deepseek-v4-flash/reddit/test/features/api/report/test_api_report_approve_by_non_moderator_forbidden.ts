import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import type { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that a non-moderator member receives a 403 Forbidden error when attempting to approve a report.
 *
 * Validates the authorization boundary for report approval: only community moderators and the community owner may approve reports. A regular authenticated member who is not a moderator or owner of the community where the reported content resides must be rejected with a 403 Forbidden HTTP status.
 *
 * The test sets up two members: Member A (who creates the community, becoming its owner, subscribes, and creates a text post) and Member B (who reports the post and then attempts to approve it). Since Member B is neither a moderator nor the owner of the community, the approve request must be denied.
 *
 * 1. Member A registers via the join endpoint (becomes the community owner).
 * 2. Member B registers via the join endpoint (reporter — not a moderator or owner).
 * 3. Member A creates a new community (becomes owner with full moderation authority).
 * 4. Member A subscribes to the community to enable post creation.
 * 5. Member A creates a text post in the community.
 * 6. Member B submits a report against Member A's post (status set to 'pending').
 * 7. Member B attempts to approve the report — expects 403 Forbidden error.
 */
export async function test_api_report_approve_by_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member B joins (reporter)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Member A subscribes to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 5. Member A creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Member B reports the post
  const report = await generate_random_community_platform_member_reports_create(
    memberBConnection,
    {
      body: {
        targetType: "post" as const,
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(report);
  // 7. Member B (not a moderator) attempts to approve the report → 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot approve report",
    403,
    async () => {
      await api.functional.communityPlatform.member.reports.approve(
        memberBConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
