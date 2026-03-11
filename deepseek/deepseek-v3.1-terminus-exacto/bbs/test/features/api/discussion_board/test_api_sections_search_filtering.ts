import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_sections_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Test 1: Search with partial name matching
  const searchResult1 =
    await api.functional.discussionBoard.member.topics.index(memberConnection, {
      body: {
        search: "test",
        page: 1,
        limit: 10,
        sort: "name:asc",
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchResult1);
  // Validate pagination metadata business logic
  TestValidator.equals(
    "pagination current page matches request",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchResult1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records consistent with data length",
    searchResult1.pagination.records >= searchResult1.data.length,
  );
  // Test 2: Sort by creation date descending
  const searchResult2 =
    await api.functional.discussionBoard.member.topics.index(memberConnection, {
      body: {
        sort: "created_at:desc",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchResult2);
  // Test 3: Empty search term (should return all sections)
  const searchResult3 =
    await api.functional.discussionBoard.member.topics.index(memberConnection, {
      body: {
        search: "",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchResult3);
  // Test 4: Search term with no matches
  const searchResult4 =
    await api.functional.discussionBoard.member.topics.index(memberConnection, {
      body: {
        search: "nonexistent-section-name-that-should-not-match-anything",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchResult4);
  TestValidator.equals(
    "no matches for non-existent search term",
    searchResult4.data.length,
    0,
  );
  // Test 5: Maximum limit test
  const searchResult5 =
    await api.functional.discussionBoard.member.topics.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchResult5);
  TestValidator.equals(
    "maximum limit applied correctly",
    searchResult5.pagination.limit,
    100,
  );
}
