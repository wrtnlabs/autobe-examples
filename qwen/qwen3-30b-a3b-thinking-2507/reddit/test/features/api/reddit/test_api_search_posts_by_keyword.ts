import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPostText";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_posts_by_keyword(
  connection: api.IConnection,
) {
  // Search with 'tech' keyword
  const result = await api.functional.reddit.search.posts.index(connection, {
    body: { search: "tech" } satisfies IRedditPostText.IRequest,
  });
  typia.assert(result);
  // Validate partial match (e.g., 'technology' should match 'tech')
  const hasPartialMatch = result.data.some(
    (post) =>
      post.title.toLowerCase().includes("tech") ||
      post.title.toLowerCase().includes("technology"),
  );
  TestValidator.predicate("Partial match found", hasPartialMatch);
  // Validate critical fields for any post
  const firstPost = result.data[0];
  TestValidator.equals("Author present", !!firstPost.author, true);
  TestValidator.equals("Community present", !!firstPost.community, true);
  TestValidator.predicate("Vote count positive", firstPost.vote_count > 0);
}