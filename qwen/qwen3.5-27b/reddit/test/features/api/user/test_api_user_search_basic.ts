import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
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
 * Test basic user search functionality with valid search criteria.
 * 1. Create multiple test member accounts with different usernames and display names
 * 2. Search for users using a search term that matches usernames or display names
 * 3. Verify pagination and result structure
 * 4. Verify case-insensitive and partial matching
 * 5. Verify default sorting by karma descending
 */
export async function test_api_user_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create search connection (no auth required for search endpoint)
  const searchConnection: api.IConnection = { host: connection.host };
  // 1. Create multiple test member accounts with varied usernames
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      username: "john_doe",
      display_name: "John Doe",
      email: "john.doe@test.com",
      password: "password123",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      username: "jane_smith",
      display_name: "Jane Smith",
      email: "jane.smith@test.com",
      password: "password123",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      username: "johnson_mike",
      display_name: "Johnson Mike",
      email: "johnson.mike@test.com",
      password: "password123",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(member3);
  const member4Connection: api.IConnection = { host: connection.host };
  const member4 = await authorize_member_join(member4Connection, {
    body: {
      username: "bob_wilson",
      display_name: "Bob Wilson",
      email: "bob.wilson@test.com",
      password: "password123",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(member4);
  // 2. Search for users with "john" - should match john_doe, johnson_mike, and "John Doe"
  const searchResult = await api.functional.redditClone.users.search(
    searchConnection,
    {
      body: {
        search: "john",
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Verify pagination metadata
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.equals("page limit", searchResult.pagination.limit, 20);
  TestValidator.predicate("has records", searchResult.pagination.records > 0);
  TestValidator.predicate("has pages", searchResult.pagination.pages > 0);
  // 4. Verify result structure - each user should have required fields
  for (const user of searchResult.data) {
    TestValidator.predicate("has id", user.id !== undefined);
    TestValidator.predicate("has username", user.username !== undefined);
    TestValidator.predicate(
      "has display_name",
      user.display_name !== undefined,
    );
    TestValidator.predicate("has karma", user.karma !== undefined);
    TestValidator.predicate("has created_at", user.created_at !== undefined);
  }
  // 5. Verify partial matching - "john" should match "john_doe", "johnson_mike", "John Doe"
  TestValidator.predicate(
    "found at least 2 users",
    searchResult.data.length >= 2,
  );
  // Verify at least one user contains "john" in username or display_name (case-insensitive)
  const foundJohn = searchResult.data.some(
    (user) =>
      user.username.toLowerCase().includes("john") ||
      user.display_name.toLowerCase().includes("john"),
  );
  TestValidator.predicate("found user with john", foundJohn);
  // 6. Test case-insensitive search with "JOHN"
  const searchResultUpper = await api.functional.redditClone.users.search(
    searchConnection,
    {
      body: {
        search: "JOHN",
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(searchResultUpper);
  // Should return same number of results as lowercase search
  TestValidator.equals(
    "case insensitive search returns same count",
    searchResultUpper.pagination.records,
    searchResult.pagination.records,
  );
  // 7. Test search by username field specifically
  const searchByUsername = await api.functional.redditClone.users.search(
    searchConnection,
    {
      body: {
        username: "jane",
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(searchByUsername);
  TestValidator.predicate(
    "found jane by username",
    searchByUsername.data.length >= 1,
  );
  TestValidator.equals(
    "jane username match",
    searchByUsername.data[0].username,
    "jane_smith",
  );
  // 8. Test search by display_name field specifically
  const searchByDisplayName = await api.functional.redditClone.users.search(
    searchConnection,
    {
      body: {
        display_name: "Wilson",
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(searchByDisplayName);
  TestValidator.predicate(
    "found wilson by display_name",
    searchByDisplayName.data.length >= 1,
  );
  TestValidator.equals(
    "wilson display_name match",
    searchByDisplayName.data[0].display_name,
    "Bob Wilson",
  );
  // 9. Verify sorting by karma descending (default)
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      TestValidator.predicate(
        `karma descending at index ${i}`,
        searchResult.data[i].karma >= searchResult.data[i + 1].karma,
      );
    }
  }
}
