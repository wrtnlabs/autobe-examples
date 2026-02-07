import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvCommunityPopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvCommunityPopularFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMvCommunityPopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvCommunityPopularFeed";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_popular_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test the popular feed endpoint with empty request body
  const response: IPageICommunityMvCommunityPopularFeed.ISummary =
    await api.functional.community.feed.popular.index(connection, {
      body: {} satisfies ICommunityMvCommunityPopularFeed.IRequest,
    });
  typia.assert(response);
  // Validate pagination metadata exists and has expected properties
  TestValidator.equals(
    "first page current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "first page records > 0",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page pages >= 1",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "first page data has items",
    response.data.length > 0,
  );
  // No cursor or page_token exists in the DTOs, so we cannot test pagination
  // The endpoint doesn't accept page_token parameter as IRequest is empty
  // This test validates the base functionality that is possible with available API
}
