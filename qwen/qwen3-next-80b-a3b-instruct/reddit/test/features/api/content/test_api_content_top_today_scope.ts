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
export async function test_api_content_top_today_scope(
  connection: api.IConnection,
): Promise<void> {
  // Send a request to the top content endpoint with 'Today' time scope
  const response: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.content.top.index(connection, {
      body: {
        time_scope: "Today",
        limit: 20,
      } satisfies ICommunityBbsPost.IRequest,
    });
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "response contains pagination",
    "pagination" in response,
    true,
  );
  TestValidator.equals(
    "response contains data array",
    "data" in response,
    true,
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    "current" in response.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    "limit" in response.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    "records" in response.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    "pages" in response.pagination,
    true,
  );
  // Validate limit
  TestValidator.equals("limit set correctly", response.pagination.limit, 20);
  // Validate that current page is at least 1
  TestValidator.predicate(
    "current page is 1 or greater",
    response.pagination.current >= 1,
  );
  // Validate records count
  TestValidator.predicate(
    "records count is 0 or greater",
    response.pagination.records >= 0,
  );
  // Validate pages calculation
  TestValidator.predicate(
    "pages count is 0 or greater",
    response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate each post in data array has correct structure
  for (const post of response.data) {
    TestValidator.equals("post has id", "id" in post, true);
    TestValidator.equals("post has title", "title" in post, true);
    TestValidator.equals("post has author", "author" in post, true);
    // Validate author structure
    TestValidator.equals("author has id", "id" in post.author, true);
    TestValidator.equals("author has name", "name" in post.author, true);
    TestValidator.equals(
      "author has reputation",
      "reputation" in post.author,
      true,
    );
    // Validate string types
    TestValidator.predicate("id is string", typeof post.id === "string");
    TestValidator.predicate("title is string", typeof post.title === "string");
    TestValidator.predicate(
      "author id is string",
      typeof post.author.id === "string",
    );
    TestValidator.predicate(
      "author name is string",
      typeof post.author.name === "string",
    );
    // Validate string length constraints
    TestValidator.predicate("title length <= 255", post.title.length <= 255);
    TestValidator.predicate(
      "author name length >= 1",
      post.author.name.length >= 1,
    );
    TestValidator.predicate(
      "author name length <= 100",
      post.author.name.length <= 100,
    );
    // Validate number types
    TestValidator.predicate(
      "author reputation is number",
      typeof post.author.reputation === "number",
    );
    TestValidator.predicate(
      "author reputation >= 0",
      post.author.reputation >= 0,
    );
    // Validate format constraints
    TestValidator.predicate(
      "id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.id,
      ),
    );
    TestValidator.predicate(
      "author id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.author.id,
      ),
    );
  }
}
