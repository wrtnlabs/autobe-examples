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

/**
 * Test member search functionality using username and display_name filters.
 *
 * This test validates the text search capabilities for member discovery by:
 * 1. Creating multiple test members with distinct usernames and display names
 * 2. Testing username-based partial matching (case-insensitive)
 * 3. Testing display_name-based partial matching using trigram index
 * 4. Testing the general 'search' parameter that matches both fields
 * 5. Verifying pagination structure and record counts
 * 6. Testing empty result handling when no members match
 */
export async function test_api_member_search_by_username_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test member (searcher)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "searcher_user",
      display_name: "Search Test User",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create additional test members for search testing
  const testMembers = await ArrayUtil.asyncRepeat(5, async (index) => {
    const testConnection: api.IConnection = { host: connection.host };
    const auth = await authorize_member_join(testConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: `testuser_${index}_alpha`,
        display_name: `Test Display ${index} Beta`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
    typia.assert(auth);
    return auth;
  });
  // 3. Test username search (partial match, case-insensitive)
  const usernameSearchResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        username: "alpha",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(usernameSearchResult);
  TestValidator.predicate(
    "username search returns results",
    usernameSearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain 'alpha' in username",
    usernameSearchResult.data.every((m) =>
      m.username.toLowerCase().includes("alpha"),
    ),
  );
  TestValidator.predicate(
    "pagination records match data length",
    usernameSearchResult.pagination.records >= usernameSearchResult.data.length,
  );
  // 4. Test display_name search (partial match using trigram index)
  const displayNameSearchResult =
    await api.functional.redditClone.members.index(memberConnection, {
      body: {
        display_name: "Beta",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    });
  typia.assert(displayNameSearchResult);
  TestValidator.predicate(
    "display_name search returns results",
    displayNameSearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain 'Beta' in display_name",
    displayNameSearchResult.data.every((m) => m.display_name.includes("Beta")),
  );
  // 5. Test general 'search' parameter (matches username OR display_name)
  const generalSearchResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(generalSearchResult);
  TestValidator.predicate(
    "general search returns results",
    generalSearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results match 'test' in username or display_name",
    generalSearchResult.data.every(
      (m) =>
        m.username.toLowerCase().includes("test") ||
        m.display_name.toLowerCase().includes("test"),
    ),
  );
  // 6. Test empty results (search for non-existent text)
  const emptySearchResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        search: "nonexistent_xyz_123",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pages is 0",
    emptySearchResult.pagination.pages,
    0,
  );
  // 7. Test pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    usernameSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    usernameSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    usernameSearchResult.pagination.pages >= 0,
  );
}
