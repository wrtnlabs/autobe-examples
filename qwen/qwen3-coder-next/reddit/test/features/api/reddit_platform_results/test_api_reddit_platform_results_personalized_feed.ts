import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformFeedResult";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_reddit_platform_results_personalized_feed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // Create new connection with token from registration
  const authenticatedConnection: api.IConnection = {
    host: memberConnection.host,
  };
  authenticatedConnection.headers = {
    Authorization: member.token.access,
  };
  // 2-10. Test various feed result scenarios
  const scenarios = [
    { description: "Basic request with default pagination", body: {} },
    {
      description: "Custom pagination (page=2, limit=10)",
      body: { page: 2, limit: 10 },
    },
    { description: "Sort by hot algorithm", body: { sort: "hot" as const } },
    { description: "Sort by new algorithm", body: { sort: "new" as const } },
    { description: "Sort by top algorithm", body: { sort: "top" as const } },
    {
      description: "Sort by controversial algorithm",
      body: { sort: "controversial" as const },
    },
    {
      description: "Time filter: today",
      body: { sort: "top" as const, timeFilter: "today" as const },
    },
    {
      description: "Time filter: week",
      body: { sort: "top" as const, timeFilter: "week" as const },
    },
    {
      description: "Time filter: month",
      body: { sort: "top" as const, timeFilter: "month" as const },
    },
    {
      description: "Time filter: year",
      body: { sort: "top" as const, timeFilter: "year" as const },
    },
    {
      description: "Time filter: all_time",
      body: { sort: "top" as const, timeFilter: "all_time" as const },
    },
    {
      description: "Include subscribed only",
      body: { includeSubscribedOnly: true },
    },
  ];
  for (const scenario of scenarios) {
    const output: IPageIRedditPlatformFeedResult.ISummary =
      await api.functional.redditPlatform.results.index(
        authenticatedConnection,
        {
          body: scenario.body,
        },
      );
    typia.assert(output);
    // Validate pagination metadata
    TestValidator.equals(
      `Pagination metadata for ${scenario.description}`,
      output.pagination.current >= 0,
      true,
    );
    TestValidator.equals(
      `Limit metadata for ${scenario.description}`,
      output.pagination.limit >= 0,
      true,
    );
    TestValidator.equals(
      `Records count for ${scenario.description}`,
      output.pagination.records >= 0,
      true,
    );
    TestValidator.equals(
      `Pages count for ${scenario.description}`,
      output.pagination.pages >= 0,
      true,
    );
    // Validate data array structure
    for (const item of output.data) {
      typia.assert(item);
      // Validate cached fields exist and have correct types
      TestValidator.equals(
        `Feed result ${item.id} has valid ID`,
        Boolean(item.id.match(/^[0-9a-f-]{36}$/i)),
        true,
      );
      TestValidator.equals(
        `Feed result ${item.id} has valid postId`,
        Boolean(item.postId.match(/^[0-9a-f-]{36}$/i)),
        true,
      );
      TestValidator.equals(
        `Feed result ${item.id} has postTitle`,
        typeof item.postTitle === "string",
        true,
      );
      TestValidator.equals(
        `Feed result ${item.id} has valid postType`,
        ["TEXT", "LINK", "IMAGE"].includes(item.postType),
        true,
      );
      TestValidator.equals(
        `Feed result ${item.id} has valid voteScore`,
        typeof item.voteScore === "number",
        true,
      );
      TestValidator.equals(
        `Feed result ${item.id} has valid commentCount`,
        typeof item.commentCount === "number",
        true,
      );
      TestValidator.equals(
        `Feed result ${item.id} has valid postCreatedAt`,
        Boolean(
          item.postCreatedAt.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        ),
        true,
      );
      TestValidator.equals(
        `Feed result ${item.id} has authorUsername`,
        typeof item.authorUsername === "string",
        true,
      );
      TestValidator.equals(
        `Feed result ${item.id} has communityName`,
        typeof item.communityName === "string",
        true,
      );
    }
  }
  // Test pagination progression
  const firstPage: IPageIRedditPlatformFeedResult.ISummary =
    await api.functional.redditPlatform.results.index(authenticatedConnection, {
      body: { page: 1, limit: 5 },
    });
  const secondPage: IPageIRedditPlatformFeedResult.ISummary =
    await api.functional.redditPlatform.results.index(authenticatedConnection, {
      body: { page: 2, limit: 5 },
    });
  // Verify pagination metadata
  TestValidator.equals(
    "First page has correct pagination metadata",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "Second page has correct pagination metadata",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "Both pages have same limit",
    firstPage.pagination.limit,
    secondPage.pagination.limit,
  );
  // Verify records and pages are consistent
  TestValidator.equals(
    "First page records count matches",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "First page pages count matches",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  // Verify no duplicate records between pages
  const firstPageIds = firstPage.data.map((item) => item.id);
  const secondPageIds = secondPage.data.map((item) => item.id);
  const hasDuplicates = firstPageIds.some((id) => secondPageIds.includes(id));
  TestValidator.equals(
    "No duplicate records between pages",
    hasDuplicates,
    false,
  );
}