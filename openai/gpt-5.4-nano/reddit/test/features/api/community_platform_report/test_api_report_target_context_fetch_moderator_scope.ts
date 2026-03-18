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

export async function test_api_report_target_context_fetch_moderator_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberAAuthorized = await authorize_member_login(memberAConnection, {
    body: {
      email: memberAConnection.headers?.Authorization
        ? (typia.random<string & tags.Format<"email">>() satisfies string &
            tags.Format<"email">)
        : (typia.random<string & tags.Format<"email">>() satisfies string &
            tags.Format<"email">),
      password: typia.random<string & tags.Format<"password">>(),
    } as unknown as ICommunityPlatformMember.ILogin,
  });
  const memberBAuthorized = await authorize_member_login(memberBConnection, {
    body: {
      email: memberBConnection.headers?.Authorization
        ? (typia.random<string & tags.Format<"email">>() satisfies string &
            tags.Format<"email">)
        : (typia.random<string & tags.Format<"email">>() satisfies string &
            tags.Format<"email">),
      password: typia.random<string & tags.Format<"password">>(),
    } as unknown as ICommunityPlatformMember.ILogin,
  });
  const community1 =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon.png" satisfies string &
            tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_platform_communities_create(
      memberBConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon2.png" satisfies string &
            tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  await generate_random_community_platform_community_moderators_create(
    memberAConnection,
    {
      body: {
        communityId: community1.id,
        moderatorUserId: memberAAuthorized.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  await generate_random_community_platform_community_moderators_create(
    memberBConnection,
    {
      body: {
        communityId: community2.id,
        moderatorUserId: memberBAuthorized.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const postIdInCommunity1 = typia.random<string & tags.Format<"uuid">>();
  const postIdInCommunity1_2 = typia.random<string & tags.Format<"uuid">>();
  const postIdInCommunity2 = typia.random<string & tags.Format<"uuid">>();
  const report1 =
    await generate_random_community_platform_member_reports_create(
      memberAConnection,
      {
        body: {
          communityId: community1.id,
          targetType: "post",
          targetId: postIdInCommunity1,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report1);
  await generate_random_community_platform_member_reports_targets_create_report_target(
    memberAConnection,
    {
      params: { reportId: report1.id },
      body: {
        target_type: "post",
        target_id: postIdInCommunity1,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
  // We cannot capture the created report-target context record id (API returns void),
  // so pass the same UUID as the targetId path parameter and validate only typed fields that exist.
  const reportTarget1 =
    await api.functional.communityPlatform.member.reports.targets.at(
      memberAConnection,
      {
        reportId: report1.id,
        targetId: postIdInCommunity1,
      },
    );
  typia.assert(reportTarget1);
  TestValidator.equals(
    "target_type matches report target type",
    reportTarget1.target_type,
    report1.targetType,
  );
  TestValidator.equals(
    "target_id matches requested post id",
    reportTarget1.target_id,
    postIdInCommunity1,
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    reportTarget1.deleted_at,
    null,
  );
  await TestValidator.error(
    "mismatched reportId/targetId returns not-found",
    async () => {
      await api.functional.communityPlatform.member.reports.targets.at(
        memberAConnection,
        {
          reportId: report1.id,
          targetId: postIdInCommunity1_2,
        },
      );
    },
  );
  const reportInCommunity2 =
    await generate_random_community_platform_member_reports_create(
      memberBConnection,
      {
        body: {
          communityId: community2.id,
          targetType: "post",
          targetId: postIdInCommunity2,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportInCommunity2);
  await generate_random_community_platform_member_reports_targets_create_report_target(
    memberBConnection,
    {
      params: { reportId: reportInCommunity2.id },
      body: {
        target_type: "post",
        target_id: postIdInCommunity2,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
  await TestValidator.error(
    "moderator cannot access report target outside their community scope",
    async () => {
      await api.functional.communityPlatform.member.reports.targets.at(
        memberAConnection,
        {
          reportId: reportInCommunity2.id,
          targetId: postIdInCommunity2,
        },
      );
    },
  );
}
