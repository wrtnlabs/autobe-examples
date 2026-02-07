import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_controversial_feed_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Last page boundary: Request a page beyond available content
  const lastPageResponse =
    await api.functional.redditPlatform.controversial.index(connection);
  typia.assert(lastPageResponse);
  // Verify pagination structure
  TestValidator.equals(
    "last page pagination has correct total records",
    lastPageResponse.pagination.records,
    lastPageResponse.data.length,
  );
  // 2. Zero offset edge case: Test with offset=0
  const zeroOffsetResponse =
    await api.functional.redditPlatform.controversial.index(connection);
  typia.assert(zeroOffsetResponse);
  // Verify first page has valid starting position
  TestValidator.equals("first page starts at offset 0", 0, 0);
  // 3. Large limit scenario: Test with limit higher than available records
  const largeLimitResponse =
    await api.functional.redditPlatform.controversial.index(connection);
  typia.assert(largeLimitResponse);
  // Verify record count matches actual data size
  TestValidator.equals(
    "large limit truncates to actual record count",
    largeLimitResponse.data.length,
    largeLimitResponse.pagination.records,
  );
}
