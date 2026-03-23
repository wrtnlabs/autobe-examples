import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAnnouncement";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering announcements with no matching results.
 * 1. Authenticate as member
 * 2. Query announcements with non-existent status filter
 * 3. Query announcements with date range that excludes all announcements
 * 4. Query announcements with search text that matches no announcements
 * 5. Verify all queries return empty data array with proper pagination metadata
 */
export async function test_api_announcements_member_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Query with non-existent status filter (using "retracted" which likely has no results)
  const retractedQuery =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      {
        body: {
          status: "retracted",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(retractedQuery);
  TestValidator.equals(
    "retracted status returns empty data",
    retractedQuery.data,
    [],
  );
  TestValidator.equals(
    "retracted status records=0",
    retractedQuery.pagination.records,
    0,
  );
  TestValidator.equals(
    "retracted status pages=0",
    retractedQuery.pagination.pages,
    0,
  );
  // 3. Query with date range that excludes all announcements (far future dates)
  const futureDateQuery =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      {
        body: {
          startDate: "2099-01-01T00:00:00.000Z",
          endDate: "2099-12-31T23:59:59.999Z",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(futureDateQuery);
  TestValidator.equals(
    "future date range returns empty data",
    futureDateQuery.data,
    [],
  );
  TestValidator.equals(
    "future date range records=0",
    futureDateQuery.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range pages=0",
    futureDateQuery.pagination.pages,
    0,
  );
  // 4. Query with search text that matches no announcements (unique random string)
  const uniqueSearchText = RandomGenerator.alphabets(30);
  const searchQuery =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      {
        body: {
          search: uniqueSearchText,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(searchQuery);
  TestValidator.equals(
    "unique search text returns empty data",
    searchQuery.data,
    [],
  );
  TestValidator.equals(
    "unique search text records=0",
    searchQuery.pagination.records,
    0,
  );
  TestValidator.equals(
    "unique search text pages=0",
    searchQuery.pagination.pages,
    0,
  );
  // 5. Verify pagination metadata structure is consistent
  TestValidator.predicate(
    "pagination has current page >= 1",
    retractedQuery.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit > 0",
    retractedQuery.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    retractedQuery.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    retractedQuery.pagination.pages >= 0,
  );
}
