import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_reports_pagination_cursor_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins system
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(member);
  memberConnection.headers = { Authorization: member.token.access };
  // 2. Generate random community_id
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create 60 reports across different timestamps
  for (let i = 0; i < 60; i++) {
    await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          community_id: communityId,
          reported_content_type: "POST" as const,
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: `${RandomGenerator.paragraph({ sentences: 5 })} Report #${i + 1}`,
        },
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 4. Test default pagination (CREATED sort, newest first)
  const page1 = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 1,
        sort_type: "CREATED" as const,
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 records", page1.pagination.records, 60);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 20);
  TestValidator.equals("page 1 pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 data length", page1.data.length, 20);
  // 5. Test page-based pagination
  const page2 = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 2,
        sort_type: "CREATED" as const,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 records", page2.pagination.records, 60);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2.data.length, 20);
  // 6. Test last page
  const page3 = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 3,
        sort_type: "CREATED" as const,
      },
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 records", page3.pagination.records, 60);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 data length", page3.data.length, 20);
  // 7. Test PRIORITY sort
  const priorityPage = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 1,
        sort_type: "PRIORITY" as const,
        priority_threshold: 3,
      },
    },
  );
  typia.assert(priorityPage);
  TestValidator.equals(
    "priority page records",
    priorityPage.pagination.records,
    60,
  );
  // 8. Test limit parameter bounds
  const smallLimitPage =
    await api.functional.redditPlatform.member.reports.index(memberConnection, {
      body: {
        limit: 5,
        page: 1,
      },
    });
  typia.assert(smallLimitPage);
  TestValidator.equals(
    "small limit records",
    smallLimitPage.pagination.records,
    60,
  );
  TestValidator.equals(
    "small limit pages",
    smallLimitPage.pagination.pages,
    12,
  );
  TestValidator.equals(
    "small limit data length",
    smallLimitPage.data.length,
    5,
  );
  const maxLimitPage = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit records",
    maxLimitPage.pagination.records,
    60,
  );
  TestValidator.equals("max limit pages", maxLimitPage.pagination.pages, 1);
  TestValidator.equals("max limit data length", maxLimitPage.data.length, 60);
  // 9. Test filtering by status resets pagination
  const pendingPage = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 1,
        status: "PENDING" as const,
      },
    },
  );
  typia.assert(pendingPage);
  TestValidator.equals(
    "pending page records",
    pendingPage.pagination.records,
    60,
  );
  TestValidator.equals(
    "pending page current",
    pendingPage.pagination.current,
    1,
  );
  // 10. Test switching sort_type resets pagination
  const createdPage = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 1,
        sort_type: "CREATED" as const,
      },
    },
  );
  typia.assert(createdPage);
  TestValidator.equals(
    "created page current",
    createdPage.pagination.current,
    1,
  );
}
