import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member search with combined filters and custom sort order.
 *
 * Validates the member search endpoint's ability to apply multiple filter criteria simultaneously — text search across username and display_name, karma range, and date range — while also enforcing a custom sort order and explicit pagination parameters.
 *
 * 1. Calls the endpoint with search term "e", karma range [-100, 10000], date range [2020-01-01, now], sort karma_highest, page 1, limit 20.
 * 2. Validates response structure and pagination metadata.
 * 3. For each returned member, verifies the search term appears case-insensitively in username or display_name, karma is within bounds, and created_at is within the date range.
 * 4. Verifies the results are sorted by karma in descending order.
 */
export async function test_api_member_search_with_filters_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const searchTerm = "e";
  const karmaMin = -100;
  const karmaMax = 10000;
  const createdAfter = "2020-01-01T00:00:00.000Z";
  const createdBefore = new Date().toISOString();
  const page = 1;
  const limit = 20;
  const result = await api.functional.communityHub.members.index(connection, {
    body: {
      search: searchTerm,
      karma_min: karmaMin,
      karma_max: karmaMax,
      created_after: createdAfter,
      created_before: createdBefore,
      sort: "karma_highest",
      page: page,
      limit: limit,
    } satisfies ICommunityHubMember.IRequest,
  });
  typia.assert(result);
  TestValidator.equals("current page", result.pagination.current, page);
  TestValidator.equals("limit", result.pagination.limit, limit);
  TestValidator.predicate(
    "records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", result.pagination.pages >= 0);
  for (const member of result.data) {
    TestValidator.predicate(
      "search matches username or display_name",
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    TestValidator.predicate(
      "karma within range",
      member.karma >= karmaMin && member.karma <= karmaMax,
    );
    const createdAt = new Date(member.created_at).getTime();
    TestValidator.predicate(
      "created_at within range",
      createdAt >= new Date(createdAfter).getTime() &&
        createdAt <= new Date(createdBefore).getTime(),
    );
  }
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      "sorted by karma highest",
      result.data[i - 1].karma >= result.data[i].karma,
    );
  }
}
