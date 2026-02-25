import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSortOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_sort_orders_filter_by_strategy_best(
  connection: api.IConnection,
): Promise<void> {
  // Prepare the request body to filter by strategy 'best', with pagination
  const body: ICommunityPlatformCommentSortOrder.IRequest = {
    strategy: "best",
    page: 1,
    limit: 10,
  };
  // Call the API with the specified filter and pagination
  const output = await api.functional.communityPlatform.commentSortOrders.index(
    connection,
    { body },
  );
  // Assert the output type and structure
  typia.assert(output);
  // Validate pagination metadata consistency
  const { pagination, data } = output;
  // Pagination current page should match requested page
  TestValidator.equals("current page", pagination.current, 1);
  // Pagination limit should match requested limit
  TestValidator.equals("limit", pagination.limit, 10);
  // Records should be >= number of data items and >= 0
  TestValidator.predicate(
    "records >= data length",
    pagination.records >= data.length && pagination.records >= 0,
  );
  // Pages should be correct based on records and limit
  const expectedPages =
    pagination.limit === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals("total pages", pagination.pages, expectedPages);
  // Each item in data should have strategy 'best'
  for (const item of data) {
    TestValidator.equals("strategy must be 'best'", item.strategy, "best");
    // Each item must have valid UUIDs for id and communityPlatformCommentId
    typia.assert<"uuid">(item.id);
    typia.assert<"uuid">(item.communityPlatformCommentId);
    // sortValue must be a number; typia assertion covers this
    // createdAt, updatedAt must be valid date-time strings
    typia.assert<string & tags.Format<"date-time">>(item.createdAt);
    typia.assert<string & tags.Format<"date-time">>(item.updatedAt);
    // deletedAt can be string date-time or null
    if (item.deletedAt !== null) {
      typia.assert<string & tags.Format<"date-time">>(item.deletedAt);
    }
  }
}
