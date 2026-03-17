import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_filter_by_date_range_and_karma_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register multiple members to test filtering and sorting
  const member1 = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1);
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const member2 = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const member3 = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member3);
  // Create authenticated connection for member listing
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: member1.token.access };
  // 2. Test created_at_from filter - should return all members created after member1
  const fromDate = new Date(member1.created_at);
  const fromResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        created_at_from: fromDate.toISOString(),
        limit: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(fromResult);
  // Verify all returned members have created_at >= fromDate
  for (const member of fromResult.data) {
    TestValidator.predicate(
      "member created after from date",
      new Date(member.created_at) >= fromDate,
    );
  }
  // 3. Test created_at_to filter - should return members created before member3
  const toDate = new Date(member3.created_at);
  const toResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        created_at_to: toDate.toISOString(),
        limit: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(toResult);
  // Verify all returned members have created_at <= toDate
  for (const member of toResult.data) {
    TestValidator.predicate(
      "member created before to date",
      new Date(member.created_at) <= toDate,
    );
  }
  // 4. Test combined date range filter
  const rangeResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        created_at_from: fromDate.toISOString(),
        created_at_to: toDate.toISOString(),
        limit: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(rangeResult);
  // Verify all members in range
  for (const member of rangeResult.data) {
    const createdAt = new Date(member.created_at);
    TestValidator.predicate(
      "member within date range",
      createdAt >= fromDate && createdAt <= toDate,
    );
  }
  // 5. Test karma sorting descending (highest first)
  const karmaDescResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        sort: "karma",
        order: "desc",
        limit: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(karmaDescResult);
  // Verify descending order by karma
  for (let i = 1; i < karmaDescResult.data.length; i++) {
    TestValidator.predicate(
      "karma descending order",
      karmaDescResult.data[i - 1].karma_score >=
        karmaDescResult.data[i].karma_score,
    );
  }
  // 6. Test karma sorting ascending (lowest first)
  const karmaAscResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        sort: "karma",
        order: "asc",
        limit: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(karmaAscResult);
  // Verify ascending order by karma
  for (let i = 1; i < karmaAscResult.data.length; i++) {
    TestValidator.predicate(
      "karma ascending order",
      karmaAscResult.data[i - 1].karma_score <=
        karmaAscResult.data[i].karma_score,
    );
  }
  // 7. Verify pagination metadata
  TestValidator.predicate(
    "current page is valid",
    fromResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    fromResult.pagination.limit > 0 && fromResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is valid",
    fromResult.pagination.records >= fromResult.data.length,
  );
  TestValidator.predicate(
    "pages count is valid",
    fromResult.pagination.pages >= 1,
  );
  // Verify pages calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    fromResult.pagination.records / fromResult.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    fromResult.pagination.pages,
    expectedPages,
  );
  // 8. Verify karma_score field exists and is integer type
  for (const member of fromResult.data) {
    TestValidator.predicate(
      "karma_score is integer",
      Number.isInteger(member.karma_score),
    );
  }
}
