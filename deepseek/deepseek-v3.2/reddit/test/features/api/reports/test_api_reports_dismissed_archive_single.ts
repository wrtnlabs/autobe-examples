import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformUserReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReportDismissal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_reports_dismissals_create } from "../../../generate/generate_random_community_platform_admin_reports_dismissals_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report_dismissal } from "../../../prepare/prepare_random_community_platform_report_dismissal";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test the basic dismissal management workflow where an admin performs an 'archive' operation on a single dismissed report.
 * Steps: 1. Authenticate admin via join. 2. Create community as member (owner). 3. Subscribe to community.
 * 4. Create text post in community. 5. Create report as different member (reporter).
 * 6. Grant admin moderation role in community. 7. Dismiss the report.
 * 8. Archive the dismissal record via management operation.
 */
export async function test_api_reports_dismissed_archive_single(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123456",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(admin);
  // 2. Member owner authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "owner123456",
      username: RandomGenerator.alphaNumeric(8),
      nickname: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(owner);
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Subscribe to community (owner subscribes to their own community)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      ownerConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 5. Create text post
  const post = await generate_random_community_platform_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 6. Reporter authentication
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "reporter123456",
      username: RandomGenerator.alphaNumeric(8),
      nickname: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(reporter);
  // 7. Create report against the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("reporter matches", report.reporter.id, reporter.id);
  // 8. Grant admin moderation role in the community
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: admin.id,
          roleType: "moderator",
        },
      },
    );
  typia.assert(moderationRole);
  TestValidator.equals(
    "role type moderator",
    moderationRole.roleType,
    "moderator",
  );
  TestValidator.equals("member matches", moderationRole.member.id, admin.id);
  TestValidator.equals(
    "community matches",
    moderationRole.community.id,
    community.id,
  );
  // 9. Dismiss the report
  const dismissal =
    await generate_random_community_platform_admin_reports_dismissals_create(
      adminConnection,
      {
        params: { reportId: report.id },
        body: {
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(dismissal);
  TestValidator.equals(
    "content report matches",
    dismissal.contentReport.id,
    report.id,
  );
  TestValidator.equals(
    "moderation role matches",
    dismissal.moderationRole.id,
    moderationRole.id,
  );
  // 10. Archive the dismissal record
  const managementResult =
    await api.functional.communityPlatform.admin.reports.dismissed.manageDismissed(
      adminConnection,
      {
        body: {
          operation: "archive",
          dismissal_ids: [dismissal.id],
        } satisfies ICommunityPlatformUserReportDismissal.IManagementRequest,
      },
    );
  typia.assert(managementResult);
  // Validation
  TestValidator.equals("operation success", managementResult.success, true);
  TestValidator.equals("processed count 1", managementResult.processedCount, 1);
  TestValidator.predicate("operation timestamp recent", () => {
    const opTime = new Date(managementResult.operationTimestamp).getTime();
    const now = Date.now();
    // Should be within last 30 seconds
    return now - opTime <= 30000;
  });
  // Verify dismissal record is archived (soft deleted)
  // Note: We cannot directly query the archived record without appropriate API,
  // but the operation succeeded with processedCount = 1
  TestValidator.predicate("message indicates success", () =>
    managementResult.message.toLowerCase().includes("success"),
  );
}
