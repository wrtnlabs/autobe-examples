import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
export async function test_api_content_top_with_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  // Generate valid parameters for request using the provided types
  const search = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const community_id = typia.random<string & tags.Format<"uuid">>();
  const min_upvote_count = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
  >();
  const from_created_at = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // One year ago
  const to_created_at = new Date().toISOString();
  const time_scope:
    | "All Time"
    | "Today"
    | "This Week"
    | "This Month"
    | "This Year" = RandomGenerator.pick([
    "All Time",
    "Today",
    "This Week",
    "This Month",
    "This Year",
  ]);
  const cursor = RandomGenerator.alphaNumeric(32);
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
  >();
  // Test request with all possible parameters combined
  const responseAll = await api.functional.communityBbs.content.top.index(
    userConnection,
    {
      body: {
        search: search,
        community_id: community_id,
        min_upvote_count: min_upvote_count,
        from_created_at: from_created_at,
        to_created_at: to_created_at,
        time_scope: time_scope,
        cursor: cursor,
        limit: limit,
      } satisfies ICommunityBbsPost.IRequest,
    },
  );
  typia.assert(responseAll);
  // Validate response structure against IPageICommunityBbsPost.ISummary
  TestValidator.equals(
    "response has pagination property",
    responseAll.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data property",
    responseAll.data !== undefined,
    true,
  );
  // Validate pagination structure against IPage.IPagination
  TestValidator.equals(
    "pagination current is number",
    typeof responseAll.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof responseAll.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination records is number",
    typeof responseAll.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof responseAll.pagination.pages === "number",
    true,
  );
  // Validate all pagination properties are positive
  TestValidator.predicate(
    "current page ≥ 1",
    responseAll.pagination.current >= 1,
  );
  TestValidator.predicate("limit ≥ 1", responseAll.pagination.limit >= 1);
  TestValidator.predicate("records ≥ 0", responseAll.pagination.records >= 0);
  TestValidator.predicate("pages ≥ 0", responseAll.pagination.pages >= 0);
  // Validate data structure against ICommunityBbsPost.ISummary[]
  for (const item of responseAll.data) {
    TestValidator.equals(
      "post id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        item.id,
      ),
      true,
    );
    TestValidator.equals(
      "post title is string",
      typeof item.title === "string",
      true,
    );
    TestValidator.predicate(
      "post title length ≤ 255",
      item.title.length <= 255,
    );
    // Validate author structure against ICommunityBbsMember.ISummary
    TestValidator.equals(
      "author has correct id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        item.author.id,
      ),
      true,
    );
    TestValidator.equals(
      "author name is string",
      typeof item.author.name === "string",
      true,
    );
    TestValidator.predicate(
      "author name length between 1 and 100",
      item.author.name.length >= 1 && item.author.name.length <= 100,
    );
    TestValidator.equals(
      "author reputation is number",
      typeof item.author.reputation === "number",
      true,
    );
    TestValidator.predicate(
      "author reputation ≥ 0",
      item.author.reputation >= 0,
    );
  }
  // Test with search only
  const responseSearch = await api.functional.communityBbs.content.top.index(
    userConnection,
    {
      body: {
        search: search,
      } satisfies ICommunityBbsPost.IRequest,
    },
  );
  typia.assert(responseSearch);
  // Test with limit only
  const responseLimit = await api.functional.communityBbs.content.top.index(
    userConnection,
    {
      body: {
        limit: 10,
      } satisfies ICommunityBbsPost.IRequest,
    },
  );
  typia.assert(responseLimit);
  // Test with time_scope only
  const responseScope = await api.functional.communityBbs.content.top.index(
    userConnection,
    {
      body: {
        time_scope: "This Year",
      } satisfies ICommunityBbsPost.IRequest,
    },
  );
  typia.assert(responseScope);
  // Test with upper limit reset to 20
  const responseUpperLimit =
    await api.functional.communityBbs.content.top.index(userConnection, {
      body: {
        limit: 20,
      } satisfies ICommunityBbsPost.IRequest,
    });
  typia.assert(responseUpperLimit);
  // Validate that when limit > 20, backend caps it to 20 (but since we're using valid range, this is ensured by schema)
}
