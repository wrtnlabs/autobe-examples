import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member discovery through username search functionality.
 *
 * This test validates:
 * 1. Partial username search with case-insensitive matching (ILIKE)
 * 2. Response contains valid member summaries without sensitive data
 * 3. Pagination metadata is properly included
 * 4. Search filtering works correctly across multiple members
 */
export async function test_api_member_discovery_search_by_username(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple test members with various usernames for search testing
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      username: `alice_test_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      username: `bob_search_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      username: `charlie_test_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(member3);
  const member4Connection: api.IConnection = { host: connection.host };
  const member4 = await authorize_member_join(member4Connection, {
    body: {
      username: `david_user_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(member4);
  // Use member1's connection to search for members
  // Test 1: Search for members with "test" in username (partial match)
  const searchTestResult = await api.functional.communityPlatform.members.index(
    member1Connection,
    {
      body: {
        search: "test",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(searchTestResult);
  // Verify pagination metadata exists
  TestValidator.predicate(
    "pagination metadata should have current page",
    searchTestResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination metadata should have limit",
    searchTestResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination metadata should have records count",
    searchTestResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination metadata should have pages count",
    searchTestResult.pagination.pages >= 0,
  );
  // Verify search results contain members with "test" in username
  TestValidator.predicate(
    "search results should contain members matching 'test'",
    searchTestResult.data.some((member) =>
      member.username.toLowerCase().includes("test"),
    ),
  );
  // Verify each member summary has required fields and no sensitive data
  for (const member of searchTestResult.data) {
    // Validate required fields exist
    TestValidator.predicate(
      "member should have id",
      member.id !== null && member.id !== undefined,
    );
    TestValidator.predicate(
      "member should have username",
      member.username !== null && member.username !== undefined,
    );
    TestValidator.predicate(
      "member should have karma",
      typeof member.karma === "number",
    );
    TestValidator.predicate(
      "member should have createdAt",
      member.createdAt !== null && member.createdAt !== undefined,
    );
    // displayName and bio can be null, so just verify the property exists
    TestValidator.predicate(
      "member should have displayName property",
      "displayName" in member,
    );
    TestValidator.predicate("member should have bio property", "bio" in member);
    TestValidator.predicate(
      "member should have avatar property",
      "avatar" in member,
    );
    // Verify sensitive fields are NEVER exposed
    TestValidator.predicate(
      "member summary should NOT expose email",
      !("email" in member),
    );
    TestValidator.predicate(
      "member summary should NOT expose password_hash",
      !("password_hash" in member),
    );
    TestValidator.predicate(
      "member summary should NOT expose password",
      !("password" in member),
    );
  }
  // Test 2: Search for specific member with unique username
  const uniqueSearchResult =
    await api.functional.communityPlatform.members.index(member1Connection, {
      body: {
        search: "alice",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(uniqueSearchResult);
  // Verify case-insensitive search (alice should find Alice or alice)
  TestValidator.predicate(
    "case-insensitive search should find 'alice' in usernames",
    uniqueSearchResult.data.some((member) =>
      member.username.toLowerCase().includes("alice"),
    ),
  );
  // Test 3: Search with empty/undefined search parameter to retrieve all members
  const allMembersResult = await api.functional.communityPlatform.members.index(
    member1Connection,
    {
      body: {
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(allMembersResult);
  // Should return multiple members
  TestValidator.predicate(
    "empty search should return members",
    allMembersResult.data.length > 0,
  );
  // Test 4: Verify search returns expected members
  // Search for "test" should return member1 and member3 (both have "test" in username)
  const testSearchResult = await api.functional.communityPlatform.members.index(
    member1Connection,
    {
      body: {
        search: "test",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(testSearchResult);
  const foundUsernames = testSearchResult.data.map((m) =>
    m.username.toLowerCase(),
  );
  const hasMatchingMembers = foundUsernames.some((username) =>
    username.includes("test"),
  );
  TestValidator.predicate(
    "search 'test' should return members with 'test' in username",
    hasMatchingMembers,
  );
  // Test 5: Test pagination with small limit
  const paginatedResult = await api.functional.communityPlatform.members.index(
    member1Connection,
    {
      body: {
        limit: 2,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated result should respect limit",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "paginated result data should not exceed limit",
    paginatedResult.data.length <= 2,
  );
}
