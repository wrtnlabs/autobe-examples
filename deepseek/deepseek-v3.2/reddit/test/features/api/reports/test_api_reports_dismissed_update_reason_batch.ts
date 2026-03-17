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

export async function test_api_reports_dismissed_update_reason_batch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare member (community owner) connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create two posts in the community
  const post1 = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 5. Create reports on both posts
  const report1 =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          postId: post1.id,
          commentId: null,
        } satisfies ICommunityPlatformContentReport.ICreate,
      },
    );
  typia.assert(report1);
  const report2 =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          postId: post2.id,
          commentId: null,
        } satisfies ICommunityPlatformContentReport.ICreate,
      },
    );
  typia.assert(report2);
  // 6. Prepare admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 7. Assign admin as moderator in the community
  // First get admin member ID by logging in admin
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const adminMemberId = adminLoginResult.id;
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      memberConnection, // member (owner) assigns admin as moderator
      {
        body: {
          memberId: adminMemberId,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderationRole);
  // 8. Admin dismisses both reports with different initial reasons
  const dismissal1 =
    await generate_random_community_platform_admin_reports_dismissals_create(
      adminConnection,
      {
        body: {
          notes: "First initial dismissal reason" satisfies string | null,
        } satisfies ICommunityPlatformReportDismissal.ICreate,
        params: { reportId: report1.id },
      },
    );
  typia.assert(dismissal1);
  const dismissal2 =
    await generate_random_community_platform_admin_reports_dismissals_create(
      adminConnection,
      {
        body: {
          notes: "Second initial dismissal reason" satisfies string | null,
        } satisfies ICommunityPlatformReportDismissal.ICreate,
        params: { reportId: report2.id },
      },
    );
  typia.assert(dismissal2);
  // 9. Member (moderator/owner) updates dismissal reasons in batch
  const newReason = "Updated batch dismissal reason";
  const result =
    await api.functional.communityPlatform.member.reports.dismissed.manageDismissed(
      memberConnection,
      {
        body: {
          operation: "update_reason",
          dismissal_ids: [dismissal1.id, dismissal2.id],
          dismissal_reason: newReason,
        } satisfies ICommunityPlatformUserReportDismissal.IManagementRequest,
      },
    );
  typia.assert(result);
  // 10. Validate batch operation success
  TestValidator.equals("batch update should succeed", result.success, true);
  TestValidator.equals("processed count should be 2", result.processedCount, 2);
  TestValidator.predicate(
    "message should indicate success",
    result.message.includes("Successfully") ||
      result.message.includes("success"),
  );
  // 11. Test updating reason to null (clearing reason)
  const nullResult =
    await api.functional.communityPlatform.member.reports.dismissed.manageDismissed(
      memberConnection,
      {
        body: {
          operation: "update_reason",
          dismissal_ids: [dismissal1.id],
          dismissal_reason: null,
        } satisfies ICommunityPlatformUserReportDismissal.IManagementRequest,
      },
    );
  typia.assert(nullResult);
  TestValidator.equals("null update should succeed", nullResult.success, true);
  TestValidator.equals(
    "null update processed count should be 1",
    nullResult.processedCount,
    1,
  );
  // 12. Test error cases: non-existent dismissal ID
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error on non-existent dismissal ID",
    async () => {
      await api.functional.communityPlatform.member.reports.dismissed.manageDismissed(
        memberConnection,
        {
          body: {
            operation: "update_reason",
            dismissal_ids: [fakeId],
            dismissal_reason: "should fail",
          } satisfies ICommunityPlatformUserReportDismissal.IManagementRequest,
        },
      );
    },
  );
  // 13. Test unauthorized access (different community owner)
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await TestValidator.error(
    "should error when non-moderator tries to update dismissal reasons",
    async () => {
      await api.functional.communityPlatform.member.reports.dismissed.manageDismissed(
        otherMemberConnection,
        {
          body: {
            operation: "update_reason",
            dismissal_ids: [dismissal1.id],
            dismissal_reason: "unauthorized attempt",
          } satisfies ICommunityPlatformUserReportDismissal.IManagementRequest,
        },
      );
    },
  );
}
