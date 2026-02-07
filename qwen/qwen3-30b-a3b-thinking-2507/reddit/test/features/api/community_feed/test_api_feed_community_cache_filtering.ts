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

export async function test_api_feed_community_cache_filtering(
  connection: api.IConnection,
): Promise<void> {
  const body = {
    feed_type: "community",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformFeedCache.IRequest;
  const output = await api.functional.communityPlatform.feed_caches.index(
    connection,
    {
      body,
    },
  );
  typia.assert(output);
  // Validate feed_type is community for all entries
  output.data.forEach((entry) => {
    TestValidator.equals(
      "feed_type should be community",
      entry.feed_type,
      "community",
    );
  });
  // Validate entries are not soft-deleted (deleted_at is null)
  output.data.forEach((entry) => {
    TestValidator.equals("deleted_at should be null", entry.deleted_at, null);
  });
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have records",
    output.pagination.records > 0,
  );
  TestValidator.equals(
    "current page should be 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", output.pagination.limit, 10);
}
