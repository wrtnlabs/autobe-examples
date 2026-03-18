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
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_snapshots_timeline_decision_presence_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 2) Member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3) Create a moderation report
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {},
  );
  typia.assert(report);
  // Ensure decided snapshots exist
  const resolution =
    await api.functional.communityPlatform.member.reports.decisions.approve.approveReportDecision(
      memberConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(resolution);
  const page = 1 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit = 50 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  // 4) hasDecision=false
  const undecidedPage =
    await api.functional.communityPlatform.admin.reports.snapshots.index(
      adminConnection,
      {
        reportId: report.id,
        body: {
          page,
          limit,
          sort: "asc",
          hasDecision: false,
        } satisfies ICommunityPlatformReportSnapshot.IRequest,
      },
    );
  typia.assert(undecidedPage);
  const undecidedData = undecidedPage.data;
  TestValidator.predicate(
    "all undecided items have snapshotDecisionedAt == null",
    undecidedData.every((x) => x.snapshotDecisionedAt === null),
  );
  // snapshotStatus meaning check: undecided snapshots should share a consistent status value (within this report)
  if (undecidedData.length > 0) {
    const undecidedStatus = undecidedData[0].snapshotStatus;
    TestValidator.predicate(
      "undecided snapshots share the same snapshotStatus",
      undecidedData.every((x) => x.snapshotStatus === undecidedStatus),
    );
  }
  // capturedAt ordering (asc)
  for (let i = 1; i < undecidedData.length; i++) {
    TestValidator.predicate(
      `capturedAt is non-decreasing for undecided set at index ${i}`,
      new Date(undecidedData[i - 1].capturedAt).getTime() <=
        new Date(undecidedData[i].capturedAt).getTime(),
    );
  }
  // 6) hasDecision=true
  const decidedPage =
    await api.functional.communityPlatform.admin.reports.snapshots.index(
      adminConnection,
      {
        reportId: report.id,
        body: {
          page,
          limit,
          sort: "asc",
          hasDecision: true,
        } satisfies ICommunityPlatformReportSnapshot.IRequest,
      },
    );
  typia.assert(decidedPage);
  const decidedData = decidedPage.data;
  TestValidator.predicate(
    "all decided items have snapshotDecisionedAt != null",
    decidedData.every((x) => x.snapshotDecisionedAt !== null),
  );
  TestValidator.predicate(
    "decided set contains no snapshotDecisionedAt == null",
    !decidedData.some((x) => x.snapshotDecisionedAt === null),
  );
  if (decidedData.length > 0) {
    const decidedStatus = decidedData[0].snapshotStatus;
    TestValidator.predicate(
      "decided snapshots share the same snapshotStatus",
      decidedData.every((x) => x.snapshotStatus === decidedStatus),
    );
  }
  // capturedAt ordering (asc)
  for (let i = 1; i < decidedData.length; i++) {
    TestValidator.predicate(
      `capturedAt is non-decreasing for decided set at index ${i}`,
      new Date(decidedData[i - 1].capturedAt).getTime() <=
        new Date(decidedData[i].capturedAt).getTime(),
    );
  }
  // Optional: snapshotStatus filtering using decided snapshotStatus
  if (decidedData.length > 0) {
    const decidedStatus = decidedData[0].snapshotStatus;
    const decidedByStatusPage =
      await api.functional.communityPlatform.admin.reports.snapshots.index(
        adminConnection,
        {
          reportId: report.id,
          body: {
            page,
            limit,
            sort: "asc",
            snapshotStatus: decidedStatus,
            hasDecision: true,
          } satisfies ICommunityPlatformReportSnapshot.IRequest,
        },
      );
    typia.assert(decidedByStatusPage);
    TestValidator.predicate(
      "hasDecision=true and snapshotStatus match decidedStatus",
      decidedByStatusPage.data.every(
        (x) =>
          x.snapshotDecisionedAt !== null && x.snapshotStatus === decidedStatus,
      ),
    );
  }
}
