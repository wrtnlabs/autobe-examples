import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  const membersConnection: api.IConnection = { host: connection.host };
  const allMembers = await api.functional.redditCommunity.members.index(
    membersConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(allMembers);
  const sortedByDate = [...allMembers.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  if (sortedByDate.length < 5) {
    throw new Error(
      "Not enough members in test data to validate date range filtering",
    );
  }
  const midPointIndex = Math.floor(sortedByDate.length / 2);
  const rangeStart = new Date(sortedByDate[0].created_at).toISOString();
  const rangeEnd = new Date(
    sortedByDate[midPointIndex].created_at,
  ).toISOString();
  const response1 = await api.functional.redditCommunity.members.index(
    membersConnection,
    {
      body: {
        page: 1,
        limit: 100,
        created_at_range: {
          start: rangeStart,
          end: rangeEnd,
        },
      },
    },
  );
  typia.assert(response1);
  TestValidator.equals(
    "created_at range filter count",
    response1.data.length,
    midPointIndex + 1,
  );
  for (const member of response1.data) {
    const memberDate = new Date(member.created_at);
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);
    TestValidator.predicate(
      `member ${member.username} is within range`,
      memberDate >= startDate && memberDate <= endDate,
    );
  }
  const farFuture = new Date(
    new Date().getTime() + 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString();
  const response2 = await api.functional.redditCommunity.members.index(
    membersConnection,
    {
      body: {
        page: 1,
        limit: 100,
        created_at_range: {
          start: farFuture,
          end: farFuture,
        },
      },
    },
  );
  typia.assert(response2);
  TestValidator.equals("empty date range data", response2.data.length, 0);
  TestValidator.equals("empty date range pages", response2.pagination.pages, 0);
  TestValidator.equals(
    "empty date range records",
    response2.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty date range current",
    response2.pagination.current,
    0,
  );
  const wideRangeStart = new Date(0).toISOString();
  const wideRangeEnd = new Date("9999-12-31T23:59:59Z").toISOString();
  const response3 = await api.functional.redditCommunity.members.index(
    membersConnection,
    {
      body: {
        page: 1,
        limit: 100,
        created_at_range: {
          start: wideRangeStart,
          end: wideRangeEnd,
        },
      },
    },
  );
  typia.assert(response3);
  TestValidator.equals(
    "wide date range count",
    response3.data.length,
    sortedByDate.length,
  );
  const updatedRangeStart = new Date(sortedByDate[0].updated_at).toISOString();
  const updatedRangeEnd = new Date(
    sortedByDate[midPointIndex].updated_at,
  ).toISOString();
  const response4 = await api.functional.redditCommunity.members.index(
    membersConnection,
    {
      body: {
        page: 1,
        limit: 100,
        updated_at_range: {
          start: updatedRangeStart,
          end: updatedRangeEnd,
        },
      },
    },
  );
  typia.assert(response4);
  TestValidator.equals(
    "updated_at range filter count",
    response4.data.length,
    midPointIndex + 1,
  );
  for (const member of response4.data) {
    const memberDate = new Date(member.updated_at);
    const startDate = new Date(updatedRangeStart);
    const endDate = new Date(updatedRangeEnd);
    TestValidator.predicate(
      `member ${member.username} updated_at in range`,
      memberDate >= startDate && memberDate <= endDate,
    );
  }
  const response5 = await api.functional.redditCommunity.members.index(
    membersConnection,
    {
      body: {
        page: 1,
        limit: 100,
        status: "active",
        created_at_range: {
          start: rangeStart,
          end: rangeEnd,
        },
      },
    },
  );
  typia.assert(response5);
  TestValidator.equals(
    "combined filters count",
    response5.data.length,
    response1.data.filter((m) => m.id !== undefined).length,
  );
  for (const member of response5.data) {
    const memberDate = new Date(member.created_at);
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);
    TestValidator.predicate(
      `combined member ${member.username} is within range`,
      memberDate >= startDate && memberDate <= endDate,
    );
  }
}
