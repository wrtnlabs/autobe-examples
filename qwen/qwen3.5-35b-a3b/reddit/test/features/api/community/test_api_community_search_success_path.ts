import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_search_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test search with "tech" query
  const techSearchResponse =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          q: "tech",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(techSearchResponse);
  // 3. Validate pagination metadata structure
  const actualLimit = techSearchResponse.pagination.limit;
  const actualRecords = techSearchResponse.pagination.records;
  const expectedPages = Math.ceil(actualRecords / actualLimit);
  TestValidator.equals(
    "pagination has current page 1",
    techSearchResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit matches request", actualLimit, 20);
  TestValidator.predicate("total records is non-negative", actualRecords >= 0);
  TestValidator.equals(
    "pages calculated correctly",
    techSearchResponse.pagination.pages,
    expectedPages,
  );
  // 4. Validate community data structure if results exist
  if (techSearchResponse.data.length > 0) {
    const firstCommunity = techSearchResponse.data[0];
    // Validate required community fields exist
    TestValidator.predicate(
      "community has valid uuid",
      firstCommunity.id !== undefined,
    );
    TestValidator.predicate(
      "community name is string",
      firstCommunity.name.length > 0,
    );
    TestValidator.predicate(
      "subscriber count is non-negative",
      firstCommunity.subscriber_count >= 0,
    );
    // Validate owner structure with type guard
    typia.assertGuard(firstCommunity.owner);
    TestValidator.predicate(
      "owner has valid uuid",
      firstCommunity.owner.id !== undefined,
    );
    TestValidator.predicate(
      "owner has username",
      firstCommunity.owner.username.length > 0,
    );
    TestValidator.predicate(
      "owner has non-negative karma",
      firstCommunity.owner.karma >= 0,
    );
    // Validate soft-deleted communities are excluded
    TestValidator.equals(
      "community is not deleted",
      firstCommunity.deleted_at,
      null,
    );
    // Validate other required fields
    TestValidator.predicate(
      "created_at is valid datetime",
      firstCommunity.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at is valid datetime",
      firstCommunity.updated_at !== undefined,
    );
  }
  // 5. Test pagination with page 2
  const page2Response =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          q: "tech",
          page: 2,
          limit: 2,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate page 2 pagination
  TestValidator.equals(
    "page 2 has current page 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 has limit 2", page2Response.pagination.limit, 2);
  const expectedPage2Pages = Math.ceil(page2Response.pagination.records / 2);
  TestValidator.equals(
    "page 2 pages calculated correctly",
    page2Response.pagination.pages,
    expectedPage2Pages,
  );
  // Test case-insensitive search with different case
  const uppercaseSearchResponse =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          q: "TECH",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(uppercaseSearchResponse);
  // Verify case-insensitive matching returns same count
  TestValidator.equals(
    "case-insensitive search returns same count",
    techSearchResponse.pagination.records,
    uppercaseSearchResponse.pagination.records,
  );
  // Test empty search results gracefully
  const emptySearchResponse =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          q: "xyz123nonexistentcommunity",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns zero pages",
    emptySearchResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search has empty data array",
    emptySearchResponse.data.length,
    0,
  );
}
