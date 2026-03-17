import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_filter_date_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create 5 test members with staggered creation dates
  const member1Connection: api.IConnection = { host: connection.host };
  const member2Connection: api.IConnection = { host: connection.host };
  const member3Connection: api.IConnection = { host: connection.host };
  const member4Connection: api.IConnection = { host: connection.host };
  const member5Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1);
  // Small delay to create different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member3);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const member4 = await authorize_member_join(member4Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member4);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const member5 = await authorize_member_join(member5Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member5);
  // Store member usernames for sorting tests
  const memberUsernames = [
    member1.token,
    member2.token,
    member3.token,
    member4.token,
    member5.token,
  ]
    .map((t) => t.access)
    .join("");
  // 2. Test status filter='active' (default)
  let response = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {} satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("default status is active", response.data.length, 5);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit default",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records count",
    response.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    1,
  );
  // 3. Test date range filtering
  // Get all members to extract timestamps
  const allMembers = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: { limit: 100 } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(allMembers);
  if (allMembers.data.length >= 2) {
    // Sort by created_at desc to get oldest and newest
    const sortedByDate = [...allMembers.data].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const oldestCreatedAt = sortedByDate[sortedByDate.length - 1].created_at;
    const newestCreatedAt = sortedByDate[0].created_at;
    // Test created_from filter
    const fromResponse = await api.functional.redditCommunity.members.index(
      connection,
      {
        body: {
          created_from: oldestCreatedAt,
        } satisfies IRedditCommunityMember.IRequest,
      },
    );
    typia.assert(fromResponse);
    TestValidator.equals(
      "created_from filter returns expected count",
      fromResponse.data.length,
      sortedByDate.length,
    );
    // Test created_to filter
    const toResponse = await api.functional.redditCommunity.members.index(
      connection,
      {
        body: {
          created_to: newestCreatedAt,
        } satisfies IRedditCommunityMember.IRequest,
      },
    );
    typia.assert(toResponse);
    TestValidator.equals(
      "created_to filter returns expected count",
      toResponse.data.length,
      sortedByDate.length,
    );
    // Test combined date range
    const combinedDate = new Date(oldestCreatedAt);
    combinedDate.setMinutes(combinedDate.getMinutes() + 30);
    const combinedTimestamp = combinedDate.toISOString();
    const rangeResponse = await api.functional.redditCommunity.members.index(
      connection,
      {
        body: {
          created_from: oldestCreatedAt,
          created_to: combinedTimestamp,
        } satisfies IRedditCommunityMember.IRequest,
      },
    );
    typia.assert(rangeResponse);
    TestValidator.predicate(
      "date range filter returns subset or full set",
      rangeResponse.data.length >= 1,
    );
  }
  // 4. Test sorting options
  // Test sortBy='created_at', sortOrder='asc' (oldest first)
  const createdAscResponse = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(createdAscResponse);
  // Verify sorting is applied (first element should be oldest)
  if (createdAscResponse.data.length >= 2) {
    const firstCreatedAt = new Date(
      createdAscResponse.data[0].created_at,
    ).getTime();
    const secondCreatedAt = new Date(
      createdAscResponse.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "created_at asc sort is correct",
      firstCreatedAt <= secondCreatedAt,
    );
  }
  // Test sortBy='created_at', sortOrder='desc' (newest first)
  const createdDescResponse =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IRedditCommunityMember.IRequest,
    });
  typia.assert(createdDescResponse);
  // Verify sorting is applied (first element should be newest)
  if (createdDescResponse.data.length >= 2) {
    const firstCreatedAt = new Date(
      createdDescResponse.data[0].created_at,
    ).getTime();
    const secondCreatedAt = new Date(
      createdDescResponse.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "created_at desc sort is correct",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // Test sortBy='username', sortOrder='asc' (alphabetical)
  const usernameAscResponse =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        sortBy: "username",
        sortOrder: "asc",
      } satisfies IRedditCommunityMember.IRequest,
    });
  typia.assert(usernameAscResponse);
  // Verify sorting is applied
  if (usernameAscResponse.data.length >= 2) {
    const firstUsername = usernameAscResponse.data[0].username.toLowerCase();
    const secondUsername = usernameAscResponse.data[1].username.toLowerCase();
    TestValidator.predicate(
      "username asc sort is correct",
      firstUsername <= secondUsername,
    );
  }
  // Test sortBy='username', sortOrder='desc' (reverse alphabetical)
  const usernameDescResponse =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        sortBy: "username",
        sortOrder: "desc",
      } satisfies IRedditCommunityMember.IRequest,
    });
  typia.assert(usernameDescResponse);
  // Verify sorting is applied
  if (usernameDescResponse.data.length >= 2) {
    const firstUsername = usernameDescResponse.data[0].username.toLowerCase();
    const secondUsername = usernameDescResponse.data[1].username.toLowerCase();
    TestValidator.predicate(
      "username desc sort is correct",
      firstUsername >= secondUsername,
    );
  }
  // 5. Test pagination with different limits
  // limit=10
  const limit10Response = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: { limit: 10 } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(limit10Response);
  TestValidator.equals(
    "limit=10: actual count",
    limit10Response.data.length,
    5,
  );
  TestValidator.equals(
    "limit=10: pagination limit",
    limit10Response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit=10: pagination records",
    limit10Response.pagination.records,
    5,
  );
  TestValidator.equals(
    "limit=10: pagination pages",
    limit10Response.pagination.pages,
    1,
  );
  // limit=50
  const limit50Response = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: { limit: 50 } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(limit50Response);
  TestValidator.equals(
    "limit=50: actual count",
    limit50Response.data.length,
    5,
  );
  TestValidator.equals(
    "limit=50: pagination limit",
    limit50Response.pagination.limit,
    50,
  );
  TestValidator.equals(
    "limit=50: pagination records",
    limit50Response.pagination.records,
    5,
  );
  TestValidator.equals(
    "limit=50: pagination pages",
    limit50Response.pagination.pages,
    1,
  );
  // limit=100 (maximum)
  const limit100Response = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: { limit: 100 } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit=100: actual count",
    limit100Response.data.length,
    5,
  );
  TestValidator.equals(
    "limit=100: pagination limit",
    limit100Response.pagination.limit,
    100,
  );
  TestValidator.equals(
    "limit=100: pagination records",
    limit100Response.pagination.records,
    5,
  );
  TestValidator.equals(
    "limit=100: pagination pages",
    limit100Response.pagination.pages,
    1,
  );
  // 6. Test edge case: filter returns no results
  const farFutureDate = new Date();
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 100);
  const noResultsResponse = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        created_from: farFutureDate.toISOString(),
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(noResultsResponse);
  TestValidator.equals(
    "empty filter: data array length",
    noResultsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter: pagination current",
    noResultsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty filter: pagination limit",
    noResultsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty filter: pagination records",
    noResultsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter: pagination pages",
    noResultsResponse.pagination.pages,
    0,
  );
}
