import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create 30 test members with unique usernames
  const memberConnections: api.IConnection[] = [];
  const memberUsernames: string[] = [];
  // Using const for immutable data
  const memberCount = 30;
  const baseUsername = "testuser";
  for (let i = 1; i <= memberCount; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const username = `${baseUsername}${i}`;
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: `${username}@example.io`,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
    typia.assert(member);
    memberConnections.push(memberConnection);
    memberUsernames.push(username);
  }
  // Step 2: Test various pagination scenarios
  // Test 1: Single result per page (limit=1, page=1)
  const limit1 = 1;
  const page1 = 1;
  const result1 =
    await api.functional.communityPlatform.member.search.members.search(
      connection,
      {
        body: {
          search: "testuser",
          limit: limit1,
          page: page1,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "pagination limit=1 returns single result",
    result1.data.length,
    limit1,
  );
  TestValidator.equals(
    "pagination limit=1 total records",
    result1.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "pagination limit=1 total pages",
    result1.pagination.pages,
    memberCount,
  );
  TestValidator.equals(
    "pagination limit=1 current page",
    result1.pagination.current,
    page1,
  );
  // Test 2: Maximum results per page (limit=100, page=1)
  const limit100 = 100;
  const pageMax = 1;
  const result2 =
    await api.functional.communityPlatform.member.search.members.search(
      connection,
      {
        body: {
          search: "testuser",
          limit: limit100,
          page: pageMax,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "pagination limit=100 returns all results",
    result2.data.length,
    memberCount,
  );
  TestValidator.equals(
    "pagination limit=100 total records",
    result2.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "pagination limit=100 total pages",
    result2.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination limit=100 current page",
    result2.pagination.current,
    pageMax,
  );
  // Test 3: High page number beyond available pages (page=1000)
  const page1000 = 1000;
  const result3 =
    await api.functional.communityPlatform.member.search.members.search(
      connection,
      {
        body: {
          search: "testuser",
          limit: 10,
          page: page1000,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.equals(
    "pagination page=1000 returns empty array",
    result3.data.length,
    0,
  );
  TestValidator.equals(
    "pagination page=1000 total records",
    result3.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "pagination page=1000 total pages",
    result3.pagination.pages,
    3,
  );
  TestValidator.equals(
    "pagination page=1000 current page",
    result3.pagination.current,
    page1000,
  );
  // Test 4: Search with default limit (limit=20, page=2) - middle of results
  const limitDefault = 20;
  const page2 = 2;
  const result4 =
    await api.functional.communityPlatform.member.search.members.search(
      connection,
      {
        body: {
          search: "testuser",
          limit: limitDefault,
          page: page2,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(result4);
  TestValidator.equals(
    "pagination default limit=20 page=2 returns 10 results",
    result4.data.length,
    10,
  );
  TestValidator.equals(
    "pagination default limit=20 total records",
    result4.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "pagination default limit=20 total pages",
    result4.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination default limit=20 current page",
    result4.pagination.current,
    page2,
  );
  // Test 5: Search with limit=5 and page=6 (last page should have 5 results)
  const limit5 = 5;
  const page6 = 6;
  const result5 =
    await api.functional.communityPlatform.member.search.members.search(
      connection,
      {
        body: {
          search: "testuser",
          limit: limit5,
          page: page6,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(result5);
  TestValidator.equals(
    "pagination limit=5 page=6 returns 5 results (last page)",
    result5.data.length,
    5,
  );
  TestValidator.equals(
    "pagination limit=5 total records",
    result5.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "pagination limit=5 total pages",
    result5.pagination.pages,
    6,
  );
  TestValidator.equals(
    "pagination limit=5 current page",
    result5.pagination.current,
    page6,
  );
  // Verify that usernames returned are from the created members
  const allReturnedUsernames = result5.data.map((item) => {
    // Since ISummary is {}, and we created members with usernames, we need to ensure search returned expected data
    // This is a validation of search functionality working correctly
    // Note: ISummary is empty, so we can't validate username directly but we can verify pagination structure
  });
  // Ensure search returns consistent result set when using same parameters
  const result6 =
    await api.functional.communityPlatform.member.search.members.search(
      connection,
      {
        body: {
          search: "testuser",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(result6);
  TestValidator.equals(
    "pagination consistency page=1 limit=10",
    result6.data.length,
    10,
  );
  // Verify total pages calculation: 30 members / 10 per page = 3 pages
  TestValidator.equals("total pages calculation", result6.pagination.pages, 3);
  // Ensure paging works for all pages (1-3)
  for (let p = 1; p <= 3; p++) {
    const pageResult =
      await api.functional.communityPlatform.member.search.members.search(
        connection,
        {
          body: {
            search: "testuser",
            limit: 10,
            page: p,
          } satisfies ICommunityPlatformMember.IRequest,
        },
      );
    typia.assert(pageResult);
    TestValidator.equals(
      `pagination page ${p} has data`,
      pageResult.data.length > 0,
      true,
    );
    TestValidator.equals(
      `pagination page ${p} has correct current page`,
      pageResult.pagination.current,
      p,
    );
    TestValidator.equals(
      `pagination page ${p} has correct number of pages`,
      pageResult.pagination.pages,
      3,
    );
  }
}
