import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_reports_targets_create_report_target } from "../../../generate/generate_random_community_platform_member_reports_targets_create_report_target";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_target } from "../../../prepare/prepare_random_community_platform_report_target";

export async function test_api_report_target_context_owner_access_and_non_moderator_denial(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1 (success): community owner can access report target context
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  await generate_random_community_platform_member_posts_create(
    ownerConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const report = await generate_random_community_platform_member_reports_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        targetType: "post",
        targetId: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  await generate_random_community_platform_member_reports_targets_create_report_target(
    ownerConnection,
    {
      params: {
        reportId: report.id,
      },
      body: {
        target_type: report.targetType,
        target_id: report.targetId,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
  const target =
    await api.functional.communityPlatform.member.reports.targets.at(
      ownerConnection,
      {
        reportId: report.id,
        targetId: report.targetId,
      },
    );
  typia.assert(target);
  TestValidator.equals("report id matches", target.report.id, report.id);
  TestValidator.equals("target id matches", target.target_id, report.targetId);
  TestValidator.equals(
    "target type matches",
    target.target_type,
    report.targetType,
  );
  // Scenario 2 (authorization denial): non-owner, non-moderator denied without leakage
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await TestValidator.httpError(
    "non-owner/non-moderator denied",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.member.reports.targets.at(
        otherConnection,
        {
          reportId: report.id,
          targetId: target.id,
        },
      );
    },
  );
  // Scenario 3 (identifier inconsistency): using targetId from another report behaves as not-found
  const report2 =
    await generate_random_community_platform_member_reports_create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report2);
  await generate_random_community_platform_member_reports_targets_create_report_target(
    ownerConnection,
    {
      params: {
        reportId: report2.id,
      },
      body: {
        target_type: report2.targetType,
        target_id: report2.targetId,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
  await TestValidator.httpError(
    "targetId from different report behaves as not-found",
    [404, 403],
    async () => {
      await api.functional.communityPlatform.member.reports.targets.at(
        ownerConnection,
        {
          reportId: report.id,
          targetId: report2.targetId,
        },
      );
    },
  );
}
