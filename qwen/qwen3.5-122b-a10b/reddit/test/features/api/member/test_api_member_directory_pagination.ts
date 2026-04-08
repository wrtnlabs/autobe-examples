import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cursor-based pagination functionality of the member directory.
 *
 * Validates the pagination implementation for the member listing endpoint by creating multiple member accounts and testing cursor-based navigation through the results. Ensures that pagination correctly handles page boundaries, cursor extraction, and maintains sort order consistency.
 *
 * The test creates sufficient member accounts to span multiple pages, then verifies that: first page returns the correct number of members, cursor is properly extracted from pagination metadata, subsequent pages return the correct members without duplicates, sort order (createdAt DESC) is maintained across pages, edge cases like requesting beyond available pages return empty data, and varying limit parameters correctly affect page size.
 *
 * 1. Authenticate as a member to access the directory endpoint
 * 2. Create 15 member accounts with unique credentials
 * 3. Request first page with limit=5
 * 4. Verify first page contains exactly 5 members
 * 5. Extract cursor from the last member's created_at and id
 * 6. Request second page using the constructed cursor
 * 7. Verify second page contains next 5 members without overlap
 * 8. Verify sort order is maintained across all pages
 * 9. Test requesting beyond available pages returns empty data array
 * 10. Test with different limit values (3, 10) to verify page size control
 */
export async function test_api_member_directory_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access directory
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create 15 member accounts for pagination testing
  const memberUsernames: string[] = [];
  await ArrayUtil.asyncRepeat(15, async (index) => {
    const tempConnection: api.IConnection = { host: connection.host };
    const username = `${RandomGenerator.name(1)}_${index}`;
    await authorize_member_join(tempConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: username,
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
    memberUsernames.push(username);
  });
  // 3. Request first page with limit=5
  const firstPage = await api.functional.redditLike.members.index(
    memberConnection,
    {
      body: { limit: 5 } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(firstPage);
  // 4. Verify first page contains exactly 5 members
  TestValidator.equals("first page count", firstPage.data.length, 5);
  TestValidator.predicate(
    "pagination current page is 1",
    firstPage.pagination.current === 1,
  );
  // 5. Extract cursor from last member (base64 encode {createdAt, id})
  const lastMember = firstPage.data[firstPage.data.length - 1];
  const cursorData = JSON.stringify({
    createdAt: lastMember.created_at,
    id: lastMember.id,
  });
  const cursor = Buffer.from(cursorData).toString("base64");
  // 6. Request second page using the cursor
  const secondPage = await api.functional.redditLike.members.index(
    memberConnection,
    {
      body: { cursor, limit: 5 } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(secondPage);
  // 7. Verify second page contains next 5 members without overlap
  TestValidator.equals("second page count", secondPage.data.length, 5);
  const firstPageIds = new Set(firstPage.data.map((m) => m.id));
  const secondPageIds = new Set(secondPage.data.map((m) => m.id));
  const overlapCount = firstPage.data.filter((m) =>
    secondPageIds.has(m.id),
  ).length;
  TestValidator.predicate(
    "no duplicate members across pages",
    overlapCount === 0,
  );
  // 8. Verify sort order is maintained (createdAt DESC)
  const allMembers = [...firstPage.data, ...secondPage.data];
  for (let i = 1; i < allMembers.length; i++) {
    TestValidator.predicate(
      `sort order maintained at index ${i}`,
      allMembers[i - 1].created_at >= allMembers[i].created_at,
    );
  }
  // 9. Test requesting beyond available pages
  if (secondPage.data.length > 0) {
    const lastMemberPage2 = secondPage.data[secondPage.data.length - 1];
    const cursorData2 = JSON.stringify({
      createdAt: lastMemberPage2.created_at,
      id: lastMemberPage2.id,
    });
    const cursor2 = Buffer.from(cursorData2).toString("base64");
    const thirdPage = await api.functional.redditLike.members.index(
      memberConnection,
      {
        body: {
          cursor: cursor2,
          limit: 5,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
    typia.assert(thirdPage);
    // Should have remaining members (15 total - 10 on first two pages = 5 remaining)
    TestValidator.predicate(
      "third page has remaining members",
      thirdPage.data.length > 0 && thirdPage.data.length <= 5,
    );
  }
  // 10. Test with different limit value (small)
  const smallLimitPage = await api.functional.redditLike.members.index(
    memberConnection,
    {
      body: { limit: 3 } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(smallLimitPage);
  TestValidator.equals("small limit page count", smallLimitPage.data.length, 3);
  TestValidator.equals(
    "pagination limit matches",
    smallLimitPage.pagination.limit,
    3,
  );
  // 11. Test with larger limit value
  const largeLimitPage = await api.functional.redditLike.members.index(
    memberConnection,
    {
      body: { limit: 10 } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(largeLimitPage);
  TestValidator.equals(
    "large limit page count",
    largeLimitPage.data.length,
    10,
  );
  TestValidator.equals(
    "pagination limit matches",
    largeLimitPage.pagination.limit,
    10,
  );
}
