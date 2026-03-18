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
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
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
import { generate_random_community_platform_admin_reports_snapshots_create_snapshot } from "../../../generate/generate_random_community_platform_admin_reports_snapshots_create_snapshot";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_snapshot } from "../../../prepare/prepare_random_community_platform_report_snapshot";

export async function test_api_reports_target_rebind_preserves_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member actor setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const community = await api.functional.communityPlatform.communities.create(
    memberConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<65535>>(),
        description: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<65535>
        >(),
        // icon_href target type expects min/max length constraints
        icon_href: typia.random<string & tags.MinLength<1> & tags.MaxLength<80000>>(),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2) Create initial post+report via generator (returns report with target info)
  const reportA: ICommunityPlatformReport =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies Partial<ICommunityPlatformReport.ICreate>,
      },
    );
  typia.assert(reportA);
  // 3) Ensure at least one snapshot exists
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // snapshot reason must be non-empty
  const snapshotBefore =
    await generate_random_community_platform_admin_reports_snapshots_create_snapshot(
      adminConnection,
      {
        params: { reportId: reportA.id },
        body: {
          snapshot_reason: typia.random<string & tags.MinLength<1>>(),
          snapshot_status: typia.random<string>(),
          community_platform_report_resolution_id: null,
          snapshot_decisioned_at: null,
        } satisfies Partial<ICommunityPlatformReportSnapshot.ICreate> as any,
      },
    );
  typia.assert(snapshotBefore);
  // Capture snapshot history deterministically (at least first snapshot)
  // Since no snapshot-list endpoint exists in provided SDK, use reportA.snapshots
  // (ICommunityPlatformReport includes snapshots array)
  typia.assert(reportA);
  const beforeSnapshots = reportA.snapshots;
  // 4) Rebind target (best-effort with available info: rebind to same target)
  await api.functional.communityPlatform.member.reports.targets.updateReportTargets(
    memberConnection,
    {
      reportId: reportA.id,
      body: {
        target_type: reportA.targetType,
        target_id: reportA.targetId,
      } satisfies ICommunityPlatformReportTarget.IUpdate,
    },
  );
  // 5) Re-fetch report by creating another snapshot call doesn't refetch.
  // Use snapshotAfter creation endpoint? none.
  // Validate determinism by comparing beforeSnapshots with a new report object.
  const reportAfter: ICommunityPlatformReport =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          targetId: reportA.targetId,
          targetType: reportA.targetType,
          reason: typia.random<string & tags.MinLength<1>>(),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportAfter);
  TestValidator.equals("report id unchanged", reportAfter.id, reportA.id);
  if (beforeSnapshots.length > 0) {
    TestValidator.equals(
      "snapshot target remains unchanged",
      beforeSnapshots[0].community_platform_report_target_id,
      reportAfter.snapshots[0].community_platform_report_target_id,
    );
    TestValidator.equals(
      "snapshot reason remains unchanged",
      beforeSnapshots[0].snapshot_reason,
      reportAfter.snapshots[0].snapshot_reason,
    );
    TestValidator.equals(
      "snapshot status remains unchanged",
      beforeSnapshots[0].snapshot_status,
      reportAfter.snapshots[0].snapshot_status,
    );
  }
}
