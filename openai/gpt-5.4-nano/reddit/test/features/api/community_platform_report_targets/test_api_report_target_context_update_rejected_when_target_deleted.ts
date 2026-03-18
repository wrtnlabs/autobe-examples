import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_reports_targets_create_report_target } from "../../../generate/generate_random_community_platform_member_reports_targets_create_report_target";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_target } from "../../../prepare/prepare_random_community_platform_report_target";

export async function test_api_report_target_context_update_rejected_when_target_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register member as caller
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2) Create a community owned by the member
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png" satisfies string &
          tags.MaxLength<80000>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Assign caller as moderator for that community
  const moderator =
    await generate_random_community_platform_community_moderators_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: memberAuth.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 4) Create a post in that community
  // Note: the generator returns void, so we can't reliably obtain post.id.
  // We proceed to create a report and report-target context using a generated targetId.
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 5) Submit a report for the (intended) post target
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
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
  // 6) Create concrete report target context entry (targetId)
  // The createReportTarget generator returns void; we cannot read the created targetId.
  // We approximate by using the same generated uuid as target_id.
  const targetId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.communityPlatform.member.reports.targets.createReportTarget(
    memberConnection,
    {
      reportId: report.id,
      body: {
        target_type: "post",
        target_id: targetId,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
  // 7) Permanently remove/soft-delete the report target context record
  await api.functional.communityPlatform.member.reports.targets.eraseReportTarget(
    memberConnection,
    {
      reportId: report.id,
      targetId,
    },
  );
  // 8) Attempt to update rejected because target is deleted
  const updateBody = {
    target_type: "post",
    target_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityPlatformReportTarget.IUpdate;
  await TestValidator.httpError(
    "updating deleted report target context should be rejected",
    [400, 403, 404, 409],
    async () => {
      await api.functional.communityPlatform.member.reports.targets.updateTargetContext(
        memberConnection,
        {
          reportId: report.id,
          targetId,
          body: updateBody,
        },
      );
    },
  );
}
