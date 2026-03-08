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

/**
 * Test that the community owner can dismiss reports without being explicitly appointed as a moderator.
 *
 * This validates the implicit moderation authority of community owners:
 * - Owner can dismiss reports in their community without explicit moderator appointment
 * - Dismissal changes report status to 'dismissed' but preserves the reported content
 * - The two-level moderation hierarchy (owner + appointed moderators) works correctly
 */
export async function test_api_report_dismissal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // ===== Setup Phase =====
  // Step 1: Member A (community owner) joins and creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Member B (post author) joins, subscribes, and creates a post
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // Step 3: Member C (reporter) joins and creates a pending report
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community.id,
        reason: RandomGenerator.paragraph({ sentences: 5 }),
        postId: post.id,
      },
    },
  );
  typia.assert(report);
  // Verify initial report status is 'pending'
  TestValidator.equals("initial report status", report.status, "pending");
  // ===== Test Execution Phase =====
  // Step 4: Owner dismisses the report using implicit moderation authority
  const dismissedReport =
    await api.functional.communityPlatform.member.reports.dismiss(
      ownerConnection,
      { reportId: report.id },
    );
  typia.assert(dismissedReport);
  // ===== Post-Dismissal Validation =====
  // Verify the report status changed to 'dismissed'
  TestValidator.equals(
    "report status after dismissal",
    dismissedReport.status,
    "dismissed",
  );
  // Verify the report ID remains the same
  TestValidator.equals("report ID unchanged", dismissedReport.id, report.id);
  // Verify the reported content remains visible (not deleted) after dismissal
  TestValidator.predicate("reported content not deleted", () => {
    return dismissedReport.content.deleted_at === null;
  });
}
