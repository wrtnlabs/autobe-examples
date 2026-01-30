import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
export async function test_api_trending_content_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Call the trending content endpoint
  const result: IPageICommunityBbsPost =
    await api.functional.communityBbs.content.hot.index(connection);
  // Validate response structure
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 10);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // Validate data length matches limit
  TestValidator.equals("data length matches limit", result.data.length, 10);
  // Validate data order: posts should be sorted by hot_score descending
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      `post ${i} hot_score >= post ${i + 1} hot_score`,
      result.data[i].hot_score >= result.data[i + 1].hot_score,
    );
  }
}
