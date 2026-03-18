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

export async function test_api_report_target_context_update_denied_other_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register member A (caller1)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2) Register member B (caller2)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 3) Member A creates community A
  const communityA =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href:
            `https://example.com/${RandomGenerator.alphabets(8)}.png` as string,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 4) Member A assigned as moderator for community A
  const memberAMod =
    await generate_random_community_platform_community_moderators_create(
      memberAConnection,
      {
        body: {
          communityId: communityA.id,
          moderatorUserId: memberAAuth.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(memberAMod);
  // 5) Member B creates community B
  const communityB =
    await generate_random_community_platform_communities_create(
      memberBConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href:
            `https://example.com/${RandomGenerator.alphabets(8)}.png` as string,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 6) Member B assigned as moderator for community B
  const memberBMod =
    await generate_random_community_platform_community_moderators_create(
      memberBConnection,
      {
        body: {
          communityId: communityB.id,
          moderatorUserId: memberBAuth.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(memberBMod);
  // 7) Member B creates a post in community B
  await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        community_id: communityB.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 8) Member B submits a report in community B for that post
  //    (Generate helper returns a report; it internally creates a compatible post and report)
  const reportB =
    await generate_random_community_platform_member_reports_create(
      memberBConnection,
      {
        body: {
          communityId: communityB.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportB);
  // 9) Member B creates a concrete report target context in community B
  await generate_random_community_platform_member_reports_targets_create_report_target(
    memberBConnection,
    {
      params: {
        reportId: reportB.id,
      },
      body: {
        target_type: reportB.targetType,
        target_id: reportB.targetId,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
  const reportId_B = reportB.id;
  const targetId_B = reportB.targetId;
  // 10) Member A attempts update on report target context from community B (denied)
  const updatePayload = {
    target_type: reportB.targetType,
    target_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityPlatformReportTarget.IUpdate;
  await TestValidator.httpError(
    "update denied due to other community moderation scope (no leak)",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.reports.targets.updateTargetContext(
        memberAConnection,
        {
          reportId: reportId_B,
          targetId: targetId_B,
          body: updatePayload,
        },
      );
    },
  );
}
