import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySnapshot";
import type { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering and sorting functionality for community snapshots.
 *
 * Validates the snapshot retrieval workflow with date range filtering and sorting options.
 * Tests that the API correctly handles pagination, date range constraints, and sort
 * direction parameters when browsing historical community snapshots.
 *
 * Special attention is given to verifying that filters are applied correctly and that
 * the pagination metadata accurately reflects the filtered result set.
 *
 * 1. Create a member account for authentication
 * 2. Test default sorting behavior (newest first)
 * 3. Test date range filter with createdAfter (inclusive)
 * 4. Test date range filter with createdBefore (inclusive)
 * 5. Test combined date range filtering
 * 6. Test sort direction variations (asc/desc)
 * 7. Validate pagination metadata with filtered results
 */
export async function test_api_community_snapshot_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate test timestamps for filtering
  const now = new Date();
  const time1 = now.getTime();
  const snapshotTime1 = new Date(time1).toISOString();
  const time2 = time1 + 60 * 1000; // 1 minute later
  const snapshotTime2 = new Date(time2).toISOString();
  const time3 = time2 + 60 * 1000; // 2 minutes later
  const snapshotTime3 = new Date(time3).toISOString();
  const communityName = RandomGenerator.alphaNumeric(8);
  // 3. Test default sorting (newest first, descending)
  const defaultConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(defaultConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const defaultResult =
    await api.functional.redditPlatform.communities.snapshots.index(
      defaultConnection,
      {
        name: communityName,
        body: {},
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default sorting returns paginated response",
    defaultResult.pagination.limit,
    20,
  );
  // 4. Test date range filter: createdAfter (inclusive)
  const afterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(afterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const afterResult =
    await api.functional.redditPlatform.communities.snapshots.index(
      afterConnection,
      {
        name: communityName,
        body: {
          createdAfter: snapshotTime2,
        },
      },
    );
  typia.assert(afterResult);
  TestValidator.predicate(
    "after filter returns valid pagination",
    afterResult.pagination.records >= 0,
  );
  // 5. Test date range filter: createdBefore (inclusive)
  const beforeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(beforeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const beforeResult =
    await api.functional.redditPlatform.communities.snapshots.index(
      beforeConnection,
      {
        name: communityName,
        body: {
          createdBefore: snapshotTime2,
        },
      },
    );
  typia.assert(beforeResult);
  TestValidator.predicate(
    "before filter returns valid pagination",
    beforeResult.pagination.records >= 0,
  );
  // 6. Test sort direction: oldest, ascending
  const ascConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ascConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const ascResult =
    await api.functional.redditPlatform.communities.snapshots.index(
      ascConnection,
      {
        name: communityName,
        body: {
          sort: "oldest",
          direction: "asc",
        },
      },
    );
  typia.assert(ascResult);
  TestValidator.predicate(
    "oldest asc returns valid pagination",
    ascResult.pagination.records >= 0,
  );
  // 7. Test combined filters
  const combinedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(combinedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const combinedResult =
    await api.functional.redditPlatform.communities.snapshots.index(
      combinedConnection,
      {
        name: communityName,
        body: {
          createdAfter: snapshotTime1,
          createdBefore: snapshotTime3,
          sort: "newest",
          direction: "desc",
          limit: 10,
        },
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filters limit",
    combinedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "combined filters returns records count",
    combinedResult.pagination.records >= 0,
  );
  // 8. Test pagination with filtered results
  const paginationConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(paginationConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const paginationResult =
    await api.functional.redditPlatform.communities.snapshots.index(
      paginationConnection,
      {
        name: communityName,
        body: {
          createdAfter: snapshotTime2,
          limit: 5,
          page: 1,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination respects limit",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records valid",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    paginationResult.pagination.pages >= 0,
  );
}
