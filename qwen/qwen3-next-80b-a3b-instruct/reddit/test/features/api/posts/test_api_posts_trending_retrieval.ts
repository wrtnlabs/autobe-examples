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
export async function test_api_posts_trending_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Execute trending posts retrieval with default pagination
  const trendingPosts: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.posts.trending.index(connection);
  // Validate the response structure and entire object using typia.assert
  // This comprehensive validation ensures type safety, format correctness (uuid, string, etc.),
  // property existence, schema compliance, and all constraints (maxLength, minLength, minimum, etc.)
  typia.assert(trendingPosts);
  // Verify pagination metadata properties are within expected ranges
  // We validate ranges as they are non-type constraints that typia.assert might not specifically validate at the schema level
  TestValidator.predicate(
    "pagination current page is at least 1",
    trendingPosts.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    trendingPosts.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    trendingPosts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    trendingPosts.pagination.pages >= 0,
  );
}
