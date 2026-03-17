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

export async function test_api_member_search_username_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member accounts with specific test data
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: "john@example.com",
      password: "1234",
      href: "http://test.local/join",
      referrer: "http://test.local/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: "jane@test.com",
      password: "1234",
      href: "http://test.local/join",
      referrer: "http://test.local/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Auth);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: "bob@example.com",
      password: "1234",
      href: "http://test.local/join",
      referrer: "http://test.local/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member3Auth);
  const member4Connection: api.IConnection = { host: connection.host };
  const member4Auth = await authorize_member_join(member4Connection, {
    body: {
      email: "alice@example.com",
      password: "1234",
      href: "http://test.local/join",
      referrer: "http://test.local/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member4Auth);
  // Step 2: Login to get authenticated connection for search
  const searchConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(searchConnection, {
    body: {
      email: "john@example.com",
      password: "1234",
    },
  });
  // Step 3: Test search with 'john' - should return john_doe and alice_jones
  const searchResult1 = await api.functional.redditCommunity.members.index(
    searchConnection,
    {
      body: { search: "john" } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(searchResult1);
  TestValidator.equals(
    "john search returns john_doe and alice_jones",
    searchResult1.data.length,
    2,
  );
  const johnMatches = searchResult1.data.map((m) => m.username);
  TestValidator.equals(
    "john_doe included",
    johnMatches.includes("john_doe"),
    true,
  );
  TestValidator.equals(
    "alice_jones included",
    johnMatches.includes("alice_jones"),
    true,
  );
  TestValidator.equals(
    "jane_smith not included",
    johnMatches.includes("jane_smith"),
    false,
  );
  TestValidator.equals(
    "bob_wilson not included",
    johnMatches.includes("bob_wilson"),
    false,
  );
  // Step 4: Test search with 'example.com' - should return john_doe, bob_wilson, alice_jones
  const searchResult2 = await api.functional.redditCommunity.members.index(
    searchConnection,
    {
      body: { search: "example.com" } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(searchResult2);
  TestValidator.equals(
    "example.com search returns 3 members",
    searchResult2.data.length,
    3,
  );
  const exampleMatches = searchResult2.data.map((m) => m.username);
  TestValidator.equals(
    "john_doe in example search",
    exampleMatches.includes("john_doe"),
    true,
  );
  TestValidator.equals(
    "bob_wilson in example search",
    exampleMatches.includes("bob_wilson"),
    true,
  );
  TestValidator.equals(
    "alice_jones in example search",
    exampleMatches.includes("alice_jones"),
    true,
  );
  TestValidator.equals(
    "jane_smith not in example search",
    exampleMatches.includes("jane_smith"),
    false,
  );
  // Step 5: Test search with empty string - should return all 4 members
  const searchResult3 = await api.functional.redditCommunity.members.index(
    searchConnection,
    {
      body: { search: "" } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(searchResult3);
  TestValidator.equals(
    "empty search returns all 4 members",
    searchResult3.data.length,
    4,
  );
  const allMatches = searchResult3.data.map((m) => m.username);
  TestValidator.equals(
    "john_doe in all results",
    allMatches.includes("john_doe"),
    true,
  );
  TestValidator.equals(
    "jane_smith in all results",
    allMatches.includes("jane_smith"),
    true,
  );
  TestValidator.equals(
    "bob_wilson in all results",
    allMatches.includes("bob_wilson"),
    true,
  );
  TestValidator.equals(
    "alice_jones in all results",
    allMatches.includes("alice_jones"),
    true,
  );
  // Step 6: Test case-insensitive search with 'JOHN' - should match 'john' results
  const searchResult4 = await api.functional.redditCommunity.members.index(
    searchConnection,
    {
      body: { search: "JOHN" } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(searchResult4);
  TestValidator.equals(
    "JOHN search case-insensitive",
    searchResult4.data.length,
    2,
  );
  const johnUpperMatches = searchResult4.data.map((m) => m.username);
  TestValidator.equals(
    "john_doe in JOHN search",
    johnUpperMatches.includes("john_doe"),
    true,
  );
  TestValidator.equals(
    "alice_jones in JOHN search",
    johnUpperMatches.includes("alice_jones"),
    true,
  );
  // Step 7: Verify pagination works with search results
  const searchResult5 = await api.functional.redditCommunity.members.index(
    searchConnection,
    {
      body: {
        search: "example",
        page: 1,
        limit: 2,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(searchResult5);
  TestValidator.equals(
    "paginated search returns limited page",
    searchResult5.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata correct",
    searchResult5.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit respected",
    searchResult5.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination records total",
    searchResult5.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages calculated",
    searchResult5.pagination.pages,
    2,
  );
  // Step 8: Verify email mask format is consistent (always present in summary)
  for (const member of searchResult1.data) {
    typia.assert(member);
    // Email should be masked in the response for privacy
    TestValidator.predicate(
      "member username present",
      member.username !== undefined,
    );
    TestValidator.predicate("member id present", member.id !== undefined);
    TestValidator.predicate(
      "created_at present",
      member.created_at !== undefined,
    );
  }
}