import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_reports_targets_create_report_target } from "../../../generate/generate_random_community_platform_member_reports_targets_create_report_target";

export async function test_api_report_target_context_update_success_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });

  const actorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };

  const community = await generate_random_community_platform_communities_create(
    actorConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);

  await generate_random_community_platform_community_moderators_create(
    actorConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: memberAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );

  await generate_random_community_platform_member_posts_create(actorConnection, {
    body: {
      community_id: community.id,
      post_type: "text",
      title: RandomGenerator.name(),
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformPost.ICreate,
  });

  const report =
    await generate_random_community_platform_member_reports_create(
      actorConnection,
      {} as unknown as never,
    );
  typia.assert(report);

  TestValidator.equals(
    "report community scope matches",
    report.community.id,
    community.id,
  );

  await generate_random_community_platform_member_reports_targets_create_report_target(
    actorConnection,
    {
      params: { reportId: report.id },
      body: {
        target_type: report.targetType,
        target_id: report.targetId,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );

  const updated =
    await api.functional.communityPlatform.member.reports.targets.updateTargetContext(
      actorConnection,
      {
        reportId: report.id,
        targetId: report.targetId,
        body: {
          target_type: report.targetType,
          target_id: report.targetId,
        } satisfies ICommunityPlatformReportTarget.IUpdate,
      },
    );

  typia.assert(updated);
  TestValidator.equals("report id preserved", updated.report.id, report.id);
  TestValidator.equals(
    "target_type updated",
    updated.target_type,
    report.targetType,
  );
  TestValidator.equals(
    "target_id updated",
    updated.target_id,
    report.targetId,
  );
}
