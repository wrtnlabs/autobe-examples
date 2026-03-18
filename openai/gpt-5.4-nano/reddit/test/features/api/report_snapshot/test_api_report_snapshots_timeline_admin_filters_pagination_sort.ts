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

export async function test_api_report_snapshots_timeline_admin_filters_pagination_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin: ICommunityPlatformAdmin.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  await authorize_admin_login(adminConnection, { body: adminLogin });
  // 2) Create a report (snapshots are assumed to exist in the system under test)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        targetType: typia.random<string & tags.MinLength<1>>(),
        targetId: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  const page1Asc = async (
    params: ICommunityPlatformReportSnapshot.IRequest,
  ): Promise<IPageICommunityPlatformReportSnapshot.ISummary> => {
    const output =
      await api.functional.communityPlatform.admin.reports.snapshots.index(
        adminConnection,
        {
          reportId: report.id,
          body: params,
        },
      );
    typia.assert(output);
    return output;
  };
  // 3) Discover viable snapshotStatus values and decision presence
  const discovered = await page1Asc({
    page: 1,
    limit: 100,
    sort: "asc",
  });
  const decidedItems = discovered.data.filter(
    (x) => x.snapshotDecisionedAt !== null,
  );
  const snapshotStatus =
    (decidedItems[0]?.snapshotStatus ?? discovered.data[0]?.snapshotStatus) ||
    typia.random<string>();
  // Ensure we can test hasDecision=true meaningfully; if decidedItems is empty,
  // the hasDecision=true call should yield empty data with correct pagination.
  // 4) Call with hasDecision=true and sort=asc
  const ascResult = await page1Asc({
    page: 1,
    limit: 10,
    sort: "asc",
    snapshotStatus,
    hasDecision: true,
  });
  TestValidator.equals("pagination current", ascResult.pagination.current, 1);
  TestValidator.equals("pagination limit", ascResult.pagination.limit, 10);
  for (const item of ascResult.data) {
    typia.assert(item);
    TestValidator.equals(
      "snapshotStatus matches filter",
      item.snapshotStatus,
      snapshotStatus,
    );
    TestValidator.notEquals(
      "snapshotDecisionedAt should not be null",
      item.snapshotDecisionedAt,
      null,
    );
  }
  if (ascResult.data.length > 1) {
    for (let i = 1; i < ascResult.data.length; ++i) {
      TestValidator.predicate(
        `capturedAt ascending at index ${i}`,
        ascResult.data[i - 1].capturedAt <= ascResult.data[i].capturedAt,
      );
    }
  }
  // 5) Call with sort=desc
  const descResult = await page1Asc({
    page: 1,
    limit: 10,
    sort: "desc",
    snapshotStatus,
    hasDecision: true,
  });
  TestValidator.equals(
    "pagination current (desc)",
    descResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit (desc)",
    descResult.pagination.limit,
    10,
  );
  for (const item of descResult.data) {
    typia.assert(item);
    TestValidator.equals(
      "snapshotStatus matches filter (desc)",
      item.snapshotStatus,
      snapshotStatus,
    );
    TestValidator.notEquals(
      "snapshotDecisionedAt should not be null (desc)",
      item.snapshotDecisionedAt,
      null,
    );
  }
  if (descResult.data.length > 1) {
    for (let i = 1; i < descResult.data.length; ++i) {
      TestValidator.predicate(
        `capturedAt descending at index ${i}`,
        descResult.data[i - 1].capturedAt >= descResult.data[i].capturedAt,
      );
    }
  }
  // 6) Call page=2 for asc ordering
  const page2Result = await page1Asc({
    page: 2,
    limit: 10,
    sort: "asc",
    snapshotStatus,
    hasDecision: true,
  });
  TestValidator.equals(
    "pagination current (page2)",
    page2Result.pagination.current,
    2,
  );
  // Validate pagination consistency
  TestValidator.equals(
    "pagination records same across pages (page2)",
    page2Result.pagination.records,
    ascResult.pagination.records,
  );
  if (ascResult.data.length > 0 && page2Result.data.length > 0) {
    const ascAll =
      ascResult.pagination.records <= 20
        ? (
            await page1Asc({
              page: 1,
              limit: 100,
              sort: "asc",
              snapshotStatus,
              hasDecision: true,
            })
          ).data
        : null;
    if (ascAll) {
      const expectedIds = ascAll.slice(10, 20).map((x) => x.id);
      const gotIds = page2Result.data.map((x) => x.id);
      TestValidator.equals(
        "page2 corresponds to next segment",
        gotIds,
        expectedIds,
      );
    }
  }
  // 7) Edge: hasDecision=false should exclude decided snapshots
  const undecidedResult = await page1Asc({
    page: 1,
    limit: 10,
    sort: "asc",
    snapshotStatus,
    hasDecision: false,
  });
  for (const item of undecidedResult.data) {
    typia.assert(item);
    TestValidator.equals(
      "undecided snapshotStatus matches filter",
      item.snapshotStatus,
      snapshotStatus,
    );
    TestValidator.equals(
      "undecided snapshotDecisionedAt should be null",
      item.snapshotDecisionedAt,
      null,
    );
  }
  // 8) Edge: if no records exist, data should be empty
  if (ascResult.pagination.records === 0) {
    TestValidator.equals("asc empty data", ascResult.data.length, 0);
  }
}
