import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_reports_resolution_update_resolution } from "../../../generate/generate_random_community_platform_admin_reports_resolution_update_resolution";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_resolution } from "../../../prepare/prepare_random_community_platform_report_resolution";

export async function test_api_report_resolution_dismiss_keeps_targeted_content(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password:
        adminJoin.email === adminJoin.email
          ? typia.random<string & tags.Format<"password">>()
          : typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2) Member actor setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 3) Create community + report
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  const reportBody: DeepPartial<ICommunityPlatformReport.ICreate> = {
    communityId: community.id,
    targetType: "post",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);
  // 4) Dismiss resolution + validate
  const dismissedDecision = "dismissed";
  const note1 = RandomGenerator.paragraph({ sentences: 1 });
  const updated1 =
    await generate_random_community_platform_admin_reports_resolution_update_resolution(
      adminLoginConnection,
      {
        params: { reportId: report.id },
        body: {
          resolution_decision: dismissedDecision,
          moderation_note: note1,
        } satisfies ICommunityPlatformReportResolution.ICreate,
      },
    );
  typia.assert(updated1);
  typia.assert(updated1.resolution!);
  TestValidator.equals(
    "resolution decision is dismissed",
    updated1.resolution!.resolutionDecision,
    dismissedDecision,
  );
  TestValidator.equals(
    "moderation note matches",
    updated1.resolution!.moderationNote,
    note1,
  );
  TestValidator.predicate("has snapshots", updated1.snapshots.length > 0);
  const lastSnapshot1 = updated1.snapshots[updated1.snapshots.length - 1];
  TestValidator.equals(
    "snapshot status consistent",
    lastSnapshot1.snapshot_status,
    dismissedDecision,
  );
  // 5) Idempotency: dismiss again with different note
  const note2 = RandomGenerator.paragraph({ sentences: 1 });
  const updated2 =
    await generate_random_community_platform_admin_reports_resolution_update_resolution(
      adminLoginConnection,
      {
        params: { reportId: report.id },
        body: {
          resolution_decision: dismissedDecision,
          moderation_note: note2,
        } satisfies ICommunityPlatformReportResolution.ICreate,
      },
    );
  typia.assert(updated2);
  typia.assert(updated2.resolution!);
  TestValidator.equals(
    "resolution decision still dismissed",
    updated2.resolution!.resolutionDecision,
    dismissedDecision,
  );
  TestValidator.equals(
    "moderation note updated",
    updated2.resolution!.moderationNote,
    note2,
  );
  TestValidator.predicate(
    "snapshots still exist",
    updated2.snapshots.length > 0,
  );
  const lastSnapshot2 = updated2.snapshots[updated2.snapshots.length - 1];
  TestValidator.equals(
    "snapshot status still dismissed",
    lastSnapshot2.snapshot_status,
    dismissedDecision,
  );
}
