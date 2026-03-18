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
import { generate_random_community_platform_member_reports_resolve_report } from "../../../generate/generate_random_community_platform_member_reports_resolve_report";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_resolution } from "../../../prepare/prepare_random_community_platform_report_resolution";

export async function test_api_report_resolution_duplicate_attempt_prevented(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { ...memberConnection.headers };
  const community = await generate_random_community_platform_communities_create(
    moderatorConnection,
    {},
  );
  const moderator =
    await generate_random_community_platform_community_moderators_create(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: member.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const post = await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const report = await generate_random_community_platform_member_reports_create(
    moderatorConnection,
    {
      body: {
        communityId: community.id,
        targetType: "post",
        targetId: post as unknown as string,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  const firstDecision: ICommunityPlatformReportResolution.ICreate = {
    resolution_decision: "dismissed",
    moderation_note: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const firstResolution =
    await generate_random_community_platform_member_reports_resolve_report(
      moderatorConnection,
      {
        params: { reportId: report.id },
        body: firstDecision,
      },
    );
  typia.assert(firstResolution);
  TestValidator.equals(
    "first resolution decision",
    firstResolution.resolutionDecision,
    "dismissed",
  );
  await TestValidator.error(
    "second resolution attempt should fail",
    async () => {
      const secondDecision: ICommunityPlatformReportResolution.ICreate = {
        resolution_decision: "approved",
        moderation_note: RandomGenerator.paragraph({ sentences: 1 }),
      };
      await generate_random_community_platform_member_reports_resolve_report(
        moderatorConnection,
        {
          params: { reportId: report.id },
          body: secondDecision,
        },
      );
    },
  );
}
