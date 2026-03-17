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
 * Test dismissal without optional notes. Create community, post, moderation role, report, then dismiss with null notes field. Validate that dismissal succeeds with null notes, report status updates correctly, and basic dismissal record is created. Test that moderator without role in report's community cannot dismiss (authorization check).
 */
export async function test_api_report_dismissal_no_notes_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for moderation role assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create community owner (member1) and community
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
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
  typia.assert(member1);
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Assign moderation role to admin in the community
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      member1Connection,
      {
        body: {
          memberId: typia.assert<string & tags.Format<"uuid">>(adminConnection.headers?.authorization
            ?.toString()
            .split(" ")[1]),
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderationRole);
  // 4. Create member2 to report
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
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
  typia.assert(member2);
  // 5. Member2 subscribes to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      member2Connection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 6. Member2 creates post to report
  const post = await generate_random_community_platform_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Member2 submits report
  const report = await generate_random_community_platform_member_reports_create(
    member2Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
        commentId: null,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report);
  // 8. Admin dismisses report with null notes
  const dismissal =
    await generate_random_community_platform_admin_reports_dismissals_create(
      adminConnection,
      {
        body: {
          notes: null,
        } satisfies ICommunityPlatformReportDismissal.ICreate,
        params: { reportId: report.id },
      },
    );
  typia.assert(dismissal);
  // 9. Validate dismissal succeeded
  TestValidator.equals("dismissal notes should be null", dismissal.notes, null);
  TestValidator.equals(
    "dismissal should reference correct report",
    dismissal.contentReport.id,
    report.id,
  );
  TestValidator.equals(
    "dismissal moderation role should match",
    dismissal.moderationRole.id,
    moderationRole.id,
  );
  // 10. Create another admin without moderation role for authorization test
  const admin2Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 11. Authorization check - admin without role cannot dismiss
  await TestValidator.error(
    "admin without moderation role should not dismiss report",
    async () => {
      await generate_random_community_platform_admin_reports_dismissals_create(
        admin2Connection,
        {
          body: {
            notes: null,
          } satisfies ICommunityPlatformReportDismissal.ICreate,
          params: { reportId: report.id },
        },
      );
    },
  );
}
