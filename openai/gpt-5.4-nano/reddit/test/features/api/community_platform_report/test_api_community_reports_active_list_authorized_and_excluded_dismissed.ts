import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_community_reports_active_list_authorized_and_excluded_dismissed(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A (authorized) setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberA);
  // 2) Member B (non-moderator) setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberB);
  // 3) Create communities
  const communityA =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_communities_create(
      memberBConnection,
      {},
    );
  typia.assert(communityB);
  // 4) Create moderation reports in community A (active by default)
  const reportA1 =
    await generate_random_community_platform_member_reports_create(
      memberAConnection,
      {
        body: {
          communityId: communityA.id,
        },
      },
    );
  typia.assert(reportA1);
  const reportA2 =
    await generate_random_community_platform_member_reports_create(
      memberAConnection,
      {
        body: {
          communityId: communityA.id,
        },
      },
    );
  typia.assert(reportA2);
  // 5) Call PATCH active queue as authorized member A
  const activePageA =
    await api.functional.communityPlatform.member.communities.reports.active.index(
      { host: memberAConnection.host },
      {
        communityId: communityA.id,
      },
    );
  typia.assert(activePageA);
  // Validate pagination basic invariants
  TestValidator.equals(
    "records matches data length",
    activePageA.pagination.records,
    activePageA.data.length,
  );
  // 6) Validate returned items are active for community A and contain expected structure
  TestValidator.predicate(
    "data is not empty (created reports should be active)",
    activePageA.data.length >= 2,
  );
  for (const item of activePageA.data) {
    typia.assert(item);
    TestValidator.equals(
      "community id matches",
      item.community.id,
      communityA.id,
    );
    TestValidator.equals(
      "deletedAt is null for active items",
      item.deletedAt,
      null,
    );
    TestValidator.equals(
      "reporter id is present",
      item.reporter.id.length > 0,
      true,
    );
    // Target context should correspond to this item
    TestValidator.equals(
      "target refers to same report id",
      item.target.report.id,
      item.id,
    );
  }
  // 7) Ordering check by createdAt DESC
  for (let i = 1; i < activePageA.data.length; i++) {
    const prev = new Date(activePageA.data[i - 1].createdAt).getTime();
    const cur = new Date(activePageA.data[i].createdAt).getTime();
    TestValidator.predicate(
      `createdAt non-increasing at index ${i}`,
      prev >= cur,
    );
  }
  // 8) Security: member B cannot view active reports of community A
  await TestValidator.httpError(
    "non-moderator must be denied",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.communities.reports.active.index(
        { host: memberBConnection.host },
        {
          communityId: communityA.id,
        },
      );
    },
  );
  // Note: Scenario dismissal exclusion is not executable here because no
  // moderation-resolution endpoint is provided in the prompt.
}
