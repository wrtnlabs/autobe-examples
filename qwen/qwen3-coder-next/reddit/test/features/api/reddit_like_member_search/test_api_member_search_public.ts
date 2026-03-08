import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_search_public(
  connection: api.IConnection,
): Promise<void> {
  // 1. Perform public member search with random criteria
  const result = await api.functional.redditLike.members.index(connection, {
    body: {
      search: RandomGenerator.paragraph({ sentences: 1 }),
      type: "post" as const,
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
      page: null,
    } satisfies IRedditLikeMember.IRequest,
  });
  // 2. Validate response structure
  typia.assert<IPageIRedditLikeMember.ISummary>(result);
  // 3. Validate pagination structure
  const pagination = result.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit >= 0);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // 4. Validate data array structure
  TestValidator.predicate("data array exists", result.data !== undefined);
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. Validate each member summary item
  for (const item of result.data) {
    typia.assert(item);
    // Validate required fields
    TestValidator.equals(
      "entity_type is valid",
      ["post", "comment", "community"],
      [item.entity_type] as const,
    );
    // Validate content length constraint (max 200)
    TestValidator.predicate(
      "content length is within limit",
      item.content.length <= 200,
    );
    // Validate score is non-negative
    TestValidator.predicate("score is non-negative", item.score >= 0);
    // Validate hit_count is non-negative
    TestValidator.predicate("hit_count is non-negative", item.hit_count >= 0);
  }
  // 6. Test empty result scenario
  const noMatchResult = await api.functional.redditLike.members.index(
    connection,
    {
      body: {
        search: RandomGenerator.alphabets(20), // Random long string unlikely to match
        limit: 10,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.predicate(
    "empty results when no match",
    noMatchResult.data.length === 0 || noMatchResult.pagination.records === 0,
  );
}
