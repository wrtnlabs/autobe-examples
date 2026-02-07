import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeedCache";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_home_cache_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.communityPlatform.feed_caches.index(
    connection,
    {
      body: {
        feed_type: "home",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(output);
  // Validate cache entries are created within 5 minutes
  const now = new Date();
  const threshold = new Date(now.getTime() - 5 * 60 * 1000);
  for (const entry of output.data) {
    const createdAt = new Date(entry.created_at);
    TestValidator.predicate(
      "entry should be within 5 minutes",
      createdAt >= threshold,
    );
  }
  // Validate pagination metadata
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records should be > 0",
    output.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages should be > 0",
    output.pagination.pages > 0,
  );
}
