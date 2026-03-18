import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportSnapshot";
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
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_snapshot } from "../../../prepare/prepare_random_community_platform_report_snapshot";

export async function test_api_report_snapshots_timeline_admin_scoped_access_no_cross_leakage(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinInput.email,
      password: adminJoinInput.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(admin);
  // 2) Create communities A and B
  const [communityA, communityB] = await Promise.all([
    generate_random_community_platform_communities_create(adminConnection, {
      body: {
        name: `community-${RandomGenerator.alphabets(10)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon-${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    }),
    generate_random_community_platform_communities_create(adminConnection, {
      body: {
        name: `community-${RandomGenerator.alphabets(10)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon-${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    }),
  ]);
  typia.assert(communityA);
  typia.assert(communityB);
  // 3) Member authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberAuth = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(memberAuth);
  // 4) Create reports A and B (avoid relying on enumerated strings in filters)
  const reportA =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: communityA.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: `reason-${RandomGenerator.alphabets(12)}`,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportA);
  const reportB =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: communityB.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: `reason-${RandomGenerator.alphabets(12)}`,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportB);
  // 5) Create snapshots for both reports. Use decision-unset to minimize filter risk.
  const snapCreateA = {
    snapshot_reason: `snap-A-${RandomGenerator.alphabets(8)}`,
    snapshot_status: typia.random<string>(),
    community_platform_report_resolution_id: null,
    snapshot_decisioned_at: null,
  } satisfies ICommunityPlatformReportSnapshot.ICreate;
  const snapCreateB = {
    snapshot_reason: `snap-B-${RandomGenerator.alphabets(8)}`,
    snapshot_status: typia.random<string>(),
    community_platform_report_resolution_id: null,
    snapshot_decisioned_at: null,
  } satisfies ICommunityPlatformReportSnapshot.ICreate;
  const [snapA, snapB] = await Promise.all([
    generate_random_community_platform_admin_reports_snapshots_create_snapshot(
      adminConnection,
      {
        params: { reportId: reportA.id },
        body: snapCreateA,
      },
    ),
    generate_random_community_platform_admin_reports_snapshots_create_snapshot(
      adminConnection,
      {
        params: { reportId: reportB.id },
        body: snapCreateB,
      },
    ),
  ]);
  typia.assert(snapA);
  typia.assert(snapB);
  // Filter sets: only hasDecision, avoid snapshotStatus to prevent unsupported string mismatch.
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const filters1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sort: "asc" as const,
    hasDecision: false,
    snapshotStatus: undefined,
  } satisfies ICommunityPlatformReportSnapshot.IRequest;
  const pageA1 =
    await api.functional.communityPlatform.admin.reports.snapshots.index(
      adminConnection,
      {
        reportId: reportA.id,
        body: filters1,
      },
    );
  typia.assert(pageA1);
  const pageB1 =
    await api.functional.communityPlatform.admin.reports.snapshots.index(
      adminConnection,
      {
        reportId: reportB.id,
        body: filters1,
      },
    );
  typia.assert(pageB1);
  const idsA1 = pageA1.data.map((s) => s.id);
  const idsB1 = pageB1.data.map((s) => s.id);
  TestValidator.predicate(
    "report A timeline includes its snapshot (filters1)",
    () => idsA1.includes(snapA.id),
  );
  TestValidator.predicate(
    "report B timeline includes its snapshot (filters1)",
    () => idsB1.includes(snapB.id),
  );
  TestValidator.predicate(
    "no cross leakage (filters1) on A",
    () => !idsA1.includes(snapB.id),
  );
  TestValidator.predicate(
    "no cross leakage (filters1) on B",
    () => !idsB1.includes(snapA.id),
  );
  const filters2 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sort: "desc" as const,
    hasDecision: false,
    snapshotStatus: undefined,
  } satisfies ICommunityPlatformReportSnapshot.IRequest;
  const pageA2 =
    await api.functional.communityPlatform.admin.reports.snapshots.index(
      adminConnection,
      {
        reportId: reportA.id,
        body: filters2,
      },
    );
  typia.assert(pageA2);
  const pageB2 =
    await api.functional.communityPlatform.admin.reports.snapshots.index(
      adminConnection,
      {
        reportId: reportB.id,
        body: filters2,
      },
    );
  typia.assert(pageB2);
  const idsA2 = pageA2.data.map((s) => s.id);
  const idsB2 = pageB2.data.map((s) => s.id);
  TestValidator.predicate(
    "report A timeline includes its snapshot (filters2)",
    () => idsA2.includes(snapA.id),
  );
  TestValidator.predicate(
    "report B timeline includes its snapshot (filters2)",
    () => idsB2.includes(snapB.id),
  );
  TestValidator.predicate(
    "no cross leakage (filters2) on A",
    () => !idsA2.includes(snapB.id),
  );
  TestValidator.predicate(
    "no cross leakage (filters2) on B",
    () => !idsB2.includes(snapA.id),
  );
}
