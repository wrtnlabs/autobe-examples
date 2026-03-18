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

export async function test_api_report_target_create_post_success_and_idempotency(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorizedMember);
  const communityA =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon_a.png" satisfies string &
            tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // Let report generator resolve a real post target within Community A.
  const reportA =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: communityA.id,
          targetType: "post",
          // omit targetId so generator can pick a resolvable post in Community A
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(reportA);
  const targetBodyA: ICommunityPlatformReportTarget.ICreate = {
    target_type: "post",
    target_id: reportA.targetId,
  } satisfies ICommunityPlatformReportTarget.ICreate;
  await api.functional.communityPlatform.member.reports.targets.createReportTarget(
    memberConnection,
    {
      reportId: reportA.id,
      body: targetBodyA,
    },
  );
  await TestValidator.predicate(
    "idempotent createReportTarget second call does not throw",
    async () => {
      await api.functional.communityPlatform.member.reports.targets.createReportTarget(
        memberConnection,
        {
          reportId: reportA.id,
          body: targetBodyA,
        },
      );
      return true;
    },
  );
  const communityB =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon_b.png" satisfies string &
            tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // Generate a separate report within Community B to obtain a resolvable postIdB.
  const reportB =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: communityB.id,
          targetType: "post",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(reportB);
  const crossCommunityTarget: ICommunityPlatformReportTarget.ICreate = {
    target_type: "post",
    target_id: reportB.targetId,
  } satisfies ICommunityPlatformReportTarget.ICreate;
  await TestValidator.error(
    "rejects cross-community target for same report",
    async () => {
      await api.functional.communityPlatform.member.reports.targets.createReportTarget(
        memberConnection,
        {
          reportId: reportA.id,
          body: crossCommunityTarget,
        },
      );
    },
  );
}
