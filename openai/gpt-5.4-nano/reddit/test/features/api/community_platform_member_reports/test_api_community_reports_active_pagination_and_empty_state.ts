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

export async function test_api_community_reports_active_pagination_and_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Create owner (community creator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  void ownerAuth;
  const community = await generate_random_community_platform_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // ---------- Scenario 2: empty queue ----------
  {
    const page =
      await api.functional.communityPlatform.member.communities.reports.active.index(
        ownerConnection,
        {
          communityId: community.id,
        },
      );
    typia.assert(page);
    TestValidator.equals("empty data", page.data.length, 0);
    TestValidator.equals("empty records", page.pagination.records, 0);
    TestValidator.equals("empty pages", page.pagination.pages, 0);
  }
  // ---------- Scenario 1: active reports + pagination consistency ----------
  const createdReportIds: Set<string> = new Set<string>();
  const reporterCount = 25;
  for (let i = 0; i < reporterCount; i++) {
    const reporterConnection: api.IConnection = { host: connection.host };
    const reporterAuth = await authorize_member_join(reporterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      },
    });
    void reporterAuth;
    const created =
      await generate_random_community_platform_member_reports_create(
        reporterConnection,
        {},
      );
    typia.assert(created);
    createdReportIds.add(created.id);
  }
  const pageWithData =
    await api.functional.communityPlatform.member.communities.reports.active.index(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(pageWithData);
  TestValidator.predicate(
    "returned data within limit",
    pageWithData.data.length <= pageWithData.pagination.limit,
  );
  TestValidator.predicate(
    "returned records cover data",
    pageWithData.pagination.records >= pageWithData.data.length,
  );
  if (pageWithData.pagination.records === 0) {
    TestValidator.equals(
      "records zero => empty data",
      pageWithData.data.length,
      0,
    );
    TestValidator.equals(
      "records zero => pages zero",
      pageWithData.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "limit positive",
      pageWithData.pagination.limit > 0,
    );
    const expectedPages = Math.ceil(
      pageWithData.pagination.records / pageWithData.pagination.limit,
    );
    TestValidator.equals(
      "pages derived from records/limit",
      pageWithData.pagination.pages,
      expectedPages,
    );
    TestValidator.predicate(
      "pages positive",
      pageWithData.pagination.pages > 0,
    );
  }
  for (const item of pageWithData.data) {
    TestValidator.predicate(
      "item id is from created active reports",
      createdReportIds.has(item.id),
    );
  }
}
