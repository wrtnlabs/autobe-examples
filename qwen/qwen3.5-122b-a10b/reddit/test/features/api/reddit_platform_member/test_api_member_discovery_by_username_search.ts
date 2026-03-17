import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_discovery_by_username_search(
  connection: api.IConnection,
): Promise<void> {
  // Create test members with distinct usernames
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "john_doe_123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "jane_smith_456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "bob_wilson_789",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member3);
  // Test 1: Search with partial username match "john"
  const searchResult1 = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        search: "john",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(searchResult1);
  TestValidator.equals(
    "search result contains john_doe_123",
    searchResult1.data.some((m) => m.username === "john_doe_123"),
    true,
  );
  TestValidator.equals(
    "search result count is 1",
    searchResult1.data.length,
    1,
  );
  // Test 2: Search with partial username match "smith"
  const searchResult2 = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        search: "smith",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(searchResult2);
  TestValidator.equals(
    "search result contains jane_smith_456",
    searchResult2.data.some((m) => m.username === "jane_smith_456"),
    true,
  );
  // Test 3: Search with email filter combined with search term
  const searchResult3 = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        search: "john",
        email: member1.email,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(searchResult3);
  TestValidator.equals(
    "email filter narrows results to exact member",
    searchResult3.data.length,
    1,
  );
  TestValidator.equals(
    "filtered result matches member1 email",
    searchResult3.data[0].id,
    member1.id,
  );
  // Test 4: Verify response contains expected summary fields
  const firstMember = searchResult1.data[0];
  TestValidator.equals(
    "member has correct username",
    firstMember.username,
    "john_doe_123",
  );
  TestValidator.equals("member has valid ID", firstMember.id, member1.id);
  TestValidator.predicate(
    "karma score is non-negative",
    firstMember.karma_score >= 0,
  );
}