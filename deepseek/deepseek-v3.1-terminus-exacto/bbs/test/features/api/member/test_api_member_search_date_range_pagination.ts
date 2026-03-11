import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
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

export async function test_api_member_search_date_range_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create member accounts
  const memberAccounts: IDiscussionBoardMember.IAuthorized[] = [];
  for (let i = 0; i < 10; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: `TestMember_${i}_${RandomGenerator.alphabets(5)}`,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://example.com",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    memberAccounts.push(member);
  }
  // Sort members by creation date for testing
  const sortedMembers = [...memberAccounts].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // Test 1: Date range filtering - middle range
  const midStart = sortedMembers[3].created_at;
  const midEnd = sortedMembers[6].created_at;
  const midRangeResult = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        created_at_start: midStart,
        created_at_end: midEnd,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(midRangeResult);
  // Validate date range filtering
  const expectedMidRangeMembers = sortedMembers.filter(
    (member) => member.created_at >= midStart && member.created_at <= midEnd,
  );
  TestValidator.equals(
    "date range filter returns correct number of members",
    midRangeResult.data.length,
    expectedMidRangeMembers.length,
  );
  // Test 2: Single day range filtering
  const singleDayMember = sortedMembers[4];
  const singleDayResult = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        created_at_start: singleDayMember.created_at,
        created_at_end: singleDayMember.created_at,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(singleDayResult);
  TestValidator.predicate(
    "single day range finds the target member",
    singleDayResult.data.some((member) => member.id === singleDayMember.id),
  );
  // Test 3: Pagination with small limit
  const paginationResult = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct page size",
    paginationResult.data.length,
    3,
  );
  TestValidator.equals(
    "pagination metadata shows correct current page",
    paginationResult.pagination.current,
    1,
  );
  // Test 4: Empty date range (no members should match)
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const emptyRangeResult = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        created_at_start: futureDate,
        created_at_end: futureDate,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(emptyRangeResult);
  TestValidator.equals(
    "empty date range returns no members",
    emptyRangeResult.data.length,
    0,
  );
  // Test 5: Exact display name search with date range
  const targetMember = sortedMembers[2];
  const exactSearchResult = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        display_name: targetMember.display_name,
        created_at_start: sortedMembers[0].created_at,
        created_at_end: sortedMembers[9].created_at,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(exactSearchResult);
  TestValidator.predicate(
    "exact display name search finds matching member",
    exactSearchResult.data.some((member) => member.id === targetMember.id),
  );
}
