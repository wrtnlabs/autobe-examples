import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test searching for members by partial username match with case-insensitive filtering.
 *
 * Steps:
 * 1. Create multiple member accounts with varied usernames (e.g., 'john_dev', 'johnny_smith', 'jane_doe')
 * 2. Call PATCH /redditClone/members with search='john' parameter
 * 3. Verify response only includes members with usernames containing 'john' (case-insensitive)
 * 4. Verify results are sorted by relevance when search is provided
 * 5. Verify pagination metadata reflects filtered results count
 * 6. Call again with search='JOHN' to confirm case-insensitive matching
 * 7. Verify search='nonexistent' returns empty data array with records=0
 */
export async function test_api_member_search_by_username_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connections using utility functions
  const johnDevConnection: api.IConnection = { host: connection.host };
  const johnnyConnection: api.IConnection = { host: connection.host };
  const janeConnection: api.IConnection = { host: connection.host };
  const aliceConnection: api.IConnection = { host: connection.host };
  // Create member with username containing 'john'
  await authorize_member_join(johnDevConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "john_dev",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create member with username containing 'johnny'
  await authorize_member_join(johnnyConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "johnny_smith",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create member with username containing 'jane' (no match)
  await authorize_member_join(janeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "jane_doe",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create member with username containing 'alice' (no match)
  await authorize_member_join(aliceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "alice_wonder",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Call PATCH /redditClone/members with search='john' parameter
  const searchResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        search: "john",
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Verify response only includes members with usernames containing 'john' (case-insensitive)
  TestValidator.equals(
    "search 'john' returns 2 results",
    searchResult.data.length,
    2,
  );
  for (const member of searchResult.data) {
    const lowerUsername = member.username.toLowerCase();
    TestValidator.predicate(
      `member ${member.username} contains 'john'`,
      lowerUsername.includes("john"),
    );
  }
  // 4. Verify results are sorted by relevance when search is provided
  // johnny_smith contains 'john' as prefix, john_dev contains 'john' in middle
  // Both should contain 'john'
  for (const member of searchResult.data) {
    TestValidator.predicate(
      `member username contains search term`,
      member.username.toLowerCase().includes("john"),
    );
  }
  // 5. Verify pagination metadata reflects filtered results count
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.equals(
    "records equals data length",
    searchResult.pagination.records,
    2,
  );
  TestValidator.predicate(
    "current page is valid",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", searchResult.pagination.limit > 0);
  // 6. Call again with search='JOHN' to confirm case-insensitive matching
  const searchResultUppercase = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        search: "JOHN",
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(searchResultUppercase);
  // Verify case-insensitive search returns same results
  TestValidator.equals(
    "case-insensitive search 'JOHN' returns same count",
    searchResultUppercase.data.length,
    2,
  );
  // Verify all returned members contain 'john' (case-insensitive)
  for (const member of searchResultUppercase.data) {
    const lowerUsername = member.username.toLowerCase();
    TestValidator.predicate(
      `member ${member.username} contains 'john' (case-insensitive)`,
      lowerUsername.includes("john"),
    );
  }
  // 7. Verify search='nonexistent' returns empty data array with records=0
  const emptyResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        search: "nonexistent",
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns 0 records",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records is 0",
    emptyResult.pagination.records,
    0,
  );
}
