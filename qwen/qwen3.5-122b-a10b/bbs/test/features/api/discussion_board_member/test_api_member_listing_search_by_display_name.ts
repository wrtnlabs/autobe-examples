import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member listing search by display name functionality.
 *
 * This test verifies the search capabilities of the member listing endpoint:
 * 1. Create multiple members with distinct display names
 * 2. Test search by partial display name match (case-insensitive)
 * 3. Test search by email partial match
 * 4. Test search with no results returns empty data with correct pagination
 * 5. Test search with special characters
 * 6. Test search with whitespace-only input
 */
export async function test_api_member_listing_search_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create member connections
  const member1Connection: api.IConnection = { host: connection.host };
  const member2Connection: api.IConnection = { host: connection.host };
  const member3Connection: api.IConnection = { host: connection.host };
  const member4Connection: api.IConnection = { host: connection.host };
  // Create members with distinct display names for search testing
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123",
      display_name: "John Doe",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1);
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123",
      display_name: "Jane Smith",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2);
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123",
      display_name: "Johnny Appleseed",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member3);
  const member4 = await authorize_member_join(member4Connection, {
    body: {
      email: "john.doe@example.com",
      password: "Password123",
      display_name: "Test User",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member4);
  // Test 1: Search by partial display name "John" (should match John Doe and Johnny Appleseed)
  const johnSearch = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "John",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(johnSearch);
  TestValidator.equals(
    "John search returns 2 members",
    johnSearch.data.length,
    2,
  );
  TestValidator.predicate(
    "John Doe found in search",
    johnSearch.data.some((m) => m.displayName === "John Doe"),
  );
  TestValidator.predicate(
    "Johnny Appleseed found in search",
    johnSearch.data.some((m) => m.displayName === "Johnny Appleseed"),
  );
  // Test 2: Case-insensitive search "john" (lowercase)
  const johnLowerSearch = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "john",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(johnLowerSearch);
  TestValidator.equals(
    "Lowercase john search returns 2 members",
    johnLowerSearch.data.length,
    2,
  );
  // Test 3: Search by email partial match "john.doe"
  const emailSearch = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "john.doe",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(emailSearch);
  TestValidator.predicate(
    "Email search finds member with matching email",
    emailSearch.data.some((m) => m.displayName === "Test User"),
  );
  // Test 4: Search with no matches returns empty data array
  const noMatchSearch = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "NonExistentUser12345",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "No match search returns empty data",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.predicate(
    "Pagination metadata exists for empty result",
    noMatchSearch.pagination.current > 0 && noMatchSearch.pagination.limit > 0,
  );
  // Test 5: Search with special characters
  const specialCharSearch = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "Smith",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(specialCharSearch);
  TestValidator.predicate(
    "Special char search finds Jane Smith",
    specialCharSearch.data.some((m) => m.displayName === "Jane Smith"),
  );
  // Test 6: Search with whitespace-only input
  const whitespaceSearch = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "   ",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(whitespaceSearch);
  TestValidator.predicate(
    "Whitespace search returns valid pagination",
    whitespaceSearch.pagination.current >= 0,
  );
  // Test 7: Search with display_name filter (exact match)
  const displayNameFilter = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        display_name: "Jane Smith",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(displayNameFilter);
  TestValidator.predicate(
    "Display name filter finds exact match",
    displayNameFilter.data.some((m) => m.displayName === "Jane Smith"),
  );
  // Test 8: Search with pagination parameters
  const paginatedSearch = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "John",
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "Pagination returns 1 result",
    paginatedSearch.data.length,
    1,
  );
  TestValidator.equals(
    "Current page is 1",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals("Limit is 1", paginatedSearch.pagination.limit, 1);
}
