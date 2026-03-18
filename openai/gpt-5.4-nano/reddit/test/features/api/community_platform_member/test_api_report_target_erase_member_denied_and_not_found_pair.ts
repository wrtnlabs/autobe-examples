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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_target_erase_member_denied_and_not_found_pair(
  connection: api.IConnection,
): Promise<void> {
  // ------------------------------
  // Actors & community setup
  // ------------------------------
  const moderatorConnection: api.IConnection = { host: connection.host };
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      },
    });
  typia.assert(moderatorAuth);
  const nonModeratorAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(nonModeratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      },
    });
  typia.assert(nonModeratorAuth);
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      moderatorConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          icon_href: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<80000>
          >(),
        },
      },
    );
  typia.assert(community);
  await generate_random_community_platform_community_moderators_create(
    moderatorConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: moderatorAuth.id,
      },
    },
  );
  // ------------------------------
  // Create report #1 => targetId1
  // ------------------------------
  await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: typia.random<string & tags.MinLength<1>>(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  const report1: ICommunityPlatformReport =
    await generate_random_community_platform_member_reports_create(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report1);
  const targetId1 = report1.targetId;
  const reportTarget1: ICommunityPlatformReportTarget =
    await api.functional.communityPlatform.member.reports.targets.at(
      moderatorConnection,
      { reportId: report1.id, targetId: targetId1 },
    );
  typia.assert(reportTarget1);
  // ------------------------------
  // Create report #2 => targetId2
  // ------------------------------
  await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: typia.random<string & tags.MinLength<1>>(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  const report2: ICommunityPlatformReport =
    await generate_random_community_platform_member_reports_create(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report2);
  const targetId2 = report2.targetId;
  // Sanity read (authorized)
  const reportTarget2: ICommunityPlatformReportTarget =
    await api.functional.communityPlatform.member.reports.targets.at(
      moderatorConnection,
      { reportId: report2.id, targetId: targetId2 },
    );
  typia.assert(reportTarget2);
  // ------------------------------
  // Scenario D: non-moderator denied
  // ------------------------------
  await TestValidator.httpError(
    "member without moderation authority must not erase report target",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.reports.targets.eraseReportTarget(
        nonModeratorConnection,
        { reportId: report1.id, targetId: targetId1 },
      );
    },
  );
  const stillThereAfterD: ICommunityPlatformReportTarget =
    await api.functional.communityPlatform.member.reports.targets.at(
      moderatorConnection,
      { reportId: report1.id, targetId: targetId1 },
    );
  typia.assert(stillThereAfterD);
  TestValidator.equals(
    "target context still exists",
    stillThereAfterD.id,
    reportTarget1.id,
  );
  // ------------------------------
  // Scenario E: not-found for mismatched pair
  // ------------------------------
  await TestValidator.httpError(
    "erase should fail not-found for mismatched (reportId,targetId) association",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.member.reports.targets.eraseReportTarget(
        nonModeratorConnection,
        { reportId: report1.id, targetId: targetId2 },
      );
    },
  );
  const stillThereAfterE: ICommunityPlatformReportTarget =
    await api.functional.communityPlatform.member.reports.targets.at(
      moderatorConnection,
      { reportId: report1.id, targetId: targetId1 },
    );
  typia.assert(stillThereAfterE);
  TestValidator.equals(
    "target context for (report1,targetId1) remains unaffected",
    stillThereAfterE.id,
    reportTarget1.id,
  );
  // Use values to avoid unused variable lint issues
  TestValidator.equals("target2 exists", reportTarget2.id, targetId2);
}
