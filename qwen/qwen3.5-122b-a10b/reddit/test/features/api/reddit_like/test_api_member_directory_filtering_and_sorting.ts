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
 * Test member directory filtering and sorting capabilities.
 *
 * Validates the member directory search functionality including username and display name substring filtering, creation date range filtering, and multi-field sorting with both ascending and descending orders. Ensures that all filter combinations work correctly and that sorting respects the specified field and order parameters.
 *
 * The test creates multiple member accounts with distinct usernames and display names, then systematically verifies each filtering and sorting combination. Special attention is given to case-insensitive matching behavior and date range boundary conditions.
 *
 * 1. Create four member accounts with distinct usernames (john_doe, jane_smith, bob_wilson, alice_jones) and display names.
 * 2. Test username substring filtering with case-insensitive matching.
 * 3. Test display name substring filtering.
 * 4. Test creation date range filtering with createdAtFrom and createdAtTo.
 * 5. Test sorting by username in ASC and DESC order.
 * 6. Test sorting by displayName in ASC and DESC order.
 * 7. Test sorting by karmaScore in ASC and DESC order.
 * 8. Test sorting by createdAt in ASC and DESC order.
 * 9. Verify filter and sort combinations produce consistent results.
 */
export async function test_api_member_directory_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member accounts with distinct usernames and display names
  const member1 = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: "john_doe",
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member1);
  const member2 = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: "jane_smith",
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member2);
  const member3 = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: "bob_wilson",
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member3);
  const member4 = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: "alice_jones",
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member4);
  // Use member1's connection for querying the directory
  const queryConnection: api.IConnection = { host: connection.host };
  queryConnection.headers = { Authorization: member1.token.access };
  // 2. Test username substring filtering (case-insensitive)
  const usernameFilterResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        username: "john",
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(usernameFilterResult);
  TestValidator.equals(
    "username filter returns matching members",
    usernameFilterResult.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "all results contain 'john' in username",
    usernameFilterResult.data.every((m) =>
      m.username.toLowerCase().includes("john"),
    ),
  );
  // 3. Test display name substring filtering
  const displayNameFilterResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        displayName: "john",
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(displayNameFilterResult);
  TestValidator.predicate(
    "all results contain 'john' in display name",
    displayNameFilterResult.data.every((m) =>
      m.display_name.toLowerCase().includes("john"),
    ),
  );
  // 4. Test creation date range filtering
  const now = new Date();
  const createdAtFrom = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const createdAtTo = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day ahead
  const dateRangeResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        createdAtFrom: createdAtFrom.toISOString() as string &
          tags.Format<"date-time">,
        createdAtTo: createdAtTo.toISOString() as string &
          tags.Format<"date-time">,
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns members within range",
    dateRangeResult.data.length >= 4,
  );
  TestValidator.predicate(
    "all results have createdAt within range",
    dateRangeResult.data.every(
      (m) =>
        new Date(m.created_at).getTime() >= createdAtFrom.getTime() &&
        new Date(m.created_at).getTime() <= createdAtTo.getTime(),
    ),
  );
  // 5. Test sorting by username ASC
  const usernameAscResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        sort: {
          field: "username",
          order: "ASC",
        },
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(usernameAscResult);
  TestValidator.predicate(
    "username ASC sorting is correct",
    usernameAscResult.data.every((m, i) => {
      if (i === 0) return true;
      return (
        m.username.localeCompare(usernameAscResult.data[i - 1].username) >= 0
      );
    }),
  );
  // 6. Test sorting by username DESC
  const usernameDescResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        sort: {
          field: "username",
          order: "DESC",
        },
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(usernameDescResult);
  TestValidator.predicate(
    "username DESC sorting is correct",
    usernameDescResult.data.every((m, i) => {
      if (i === 0) return true;
      return (
        m.username.localeCompare(usernameDescResult.data[i - 1].username) <= 0
      );
    }),
  );
  // 7. Test sorting by displayName ASC
  const displayNameAscResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        sort: {
          field: "displayName",
          order: "ASC",
        },
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(displayNameAscResult);
  TestValidator.predicate(
    "displayName ASC sorting is correct",
    displayNameAscResult.data.every((m, i) => {
      if (i === 0) return true;
      return (
        m.display_name.localeCompare(
          displayNameAscResult.data[i - 1].display_name,
        ) >= 0
      );
    }),
  );
  // 8. Test sorting by karmaScore ASC
  const karmaAscResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        sort: {
          field: "karmaScore",
          order: "ASC",
        },
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(karmaAscResult);
  TestValidator.predicate(
    "karmaScore ASC sorting is correct",
    karmaAscResult.data.every((m, i) => {
      if (i === 0) return true;
      return m.karma_score >= karmaAscResult.data[i - 1].karma_score;
    }),
  );
  // 9. Test sorting by karmaScore DESC
  const karmaDescResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        sort: {
          field: "karmaScore",
          order: "DESC",
        },
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(karmaDescResult);
  TestValidator.predicate(
    "karmaScore DESC sorting is correct",
    karmaDescResult.data.every((m, i) => {
      if (i === 0) return true;
      return m.karma_score <= karmaDescResult.data[i - 1].karma_score;
    }),
  );
  // 10. Test sorting by createdAt ASC
  const createdAtAscResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        sort: {
          field: "createdAt",
          order: "ASC",
        },
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(createdAtAscResult);
  TestValidator.predicate(
    "createdAt ASC sorting is correct",
    createdAtAscResult.data.every((m, i) => {
      if (i === 0) return true;
      return (
        new Date(m.created_at).getTime() >=
        new Date(createdAtAscResult.data[i - 1].created_at).getTime()
      );
    }),
  );
  // 11. Test sorting by createdAt DESC
  const createdAtDescResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        sort: {
          field: "createdAt",
          order: "DESC",
        },
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(createdAtDescResult);
  TestValidator.predicate(
    "createdAt DESC sorting is correct",
    createdAtDescResult.data.every((m, i) => {
      if (i === 0) return true;
      return (
        new Date(m.created_at).getTime() <=
        new Date(createdAtDescResult.data[i - 1].created_at).getTime()
      );
    }),
  );
  // 12. Test combined filter and sort
  const combinedResult = await api.functional.redditLike.members.index(
    queryConnection,
    {
      body: {
        username: "john",
        sort: {
          field: "createdAt",
          order: "DESC",
        },
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter and sort returns matching members",
    combinedResult.data.every((m) => m.username.toLowerCase().includes("john")),
  );
}
