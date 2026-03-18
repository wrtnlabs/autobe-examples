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

export async function test_api_report_target_erase_authorized_moderator_and_scope_denial(
  connection: api.IConnection,
): Promise<void> {
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorAAuth = await authorize_member_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });

  const communityA =
    await generate_random_community_platform_communities_create(
      moderatorAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon.png" satisfies
            string & tags.MinLength<1> & tags.MaxLength<80000>,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );

  const moderatorAssign =
    await generate_random_community_platform_community_moderators_create(
      moderatorAConnection,
      {
        body: {
          communityId: communityA.id,
          moderatorUserId: moderatorAAuth.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssign);

  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });

  await generate_random_community_platform_member_posts_create(
    reporterConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  const reportTarget =
    await generate_random_community_platform_member_reports_create(
      reporterConnection,
      {
        body: {
          communityId: communityA.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportTarget);

  const reportIdA = reportTarget.id;
  const targetIdA = reportTarget.targetId;

  const beforeTarget =
    await api.functional.communityPlatform.member.reports.targets.at(
      moderatorAConnection,
      {
        reportId: reportIdA,
        targetId: targetIdA,
      },
    );
  typia.assert(beforeTarget);

  await api.functional.communityPlatform.member.reports.targets.eraseReportTarget(
    moderatorAConnection,
    {
      reportId: reportIdA,
      targetId: targetIdA,
    },
  );

  const afterEraseResult =
    await api.functional.communityPlatform.member.reports.targets.at(
      moderatorAConnection,
      {
        reportId: reportIdA,
        targetId: targetIdA,
      },
    );
  typia.assert(afterEraseResult);

  const moderatorBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });

  const communityB =
    await generate_random_community_platform_communities_create(
      moderatorBConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon2.png" satisfies
            string & tags.MinLength<1> & tags.MaxLength<80000>,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );

  await generate_random_community_platform_community_moderators_create(
    moderatorBConnection,
    {
      body: {
        communityId: communityB.id,
        moderatorUserId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );

  const reporterBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });

  await generate_random_community_platform_member_posts_create(
    reporterBConnection,
    {
      body: {
        community_id: communityB.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  const reportB =
    await generate_random_community_platform_member_reports_create(
      reporterBConnection,
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

  const reportIdB = reportB.id;
  const targetIdB = reportB.targetId;

  await TestValidator.error(
    "wrong-community moderator cannot erase report-target",
    async () => {
      await api.functional.communityPlatform.member.reports.targets.eraseReportTarget(
        moderatorAConnection,
        {
          reportId: reportIdB,
          targetId: targetIdB,
        },
      );
    },
  );

  const targetBAfter =
    await api.functional.communityPlatform.member.reports.targets.at(
      moderatorBConnection,
      {
        reportId: reportIdB,
        targetId: targetIdB,
      },
    );
  typia.assert(targetBAfter);

  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });

  await api.functional.communityPlatform.member.reports.targets.eraseReportTarget(
    adminConnection,
    {
      reportId: reportIdA,
      targetId: beforeTarget.id,
    },
  );

  await TestValidator.error(
    "admin deletion removes target-context",
    async () => {
      await api.functional.communityPlatform.member.reports.targets.at(
        adminConnection,
        {
          reportId: reportIdA,
          targetId: beforeTarget.id,
        },
      );
    },
  );
}
