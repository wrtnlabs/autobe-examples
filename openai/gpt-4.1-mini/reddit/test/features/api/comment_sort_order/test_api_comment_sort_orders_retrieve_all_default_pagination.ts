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

export async function test_api_comment_sort_orders_retrieve_all_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create base connection for reuse
  // No authentication specified, so call directly
  // Compose request with no filters and default pagination
  const body: ICommunityPlatformCommentSortOrder.IRequest = {};
  // Perform the API call
  const output: IPageICommunityPlatformCommentSortOrder.ISummary =
    await api.functional.communityPlatform.commentSortOrders.index(connection, {
      body,
    });
  // Assert output against DTO
  typia.assert(output);
  // Check pagination metadata correctness
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current page should be >= 1",
    () => pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be > 0 and <= 100",
    () => pagination.limit > 0 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    () => pagination.pages >= 0,
  );
  // Validate each data item
  for (const item of output.data) {
    typia.assert(item);
    // Check required ID formats and timestamps
    TestValidator.predicate(
      "id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      "communityPlatformCommentId is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.communityPlatformCommentId,
      ),
    );
    TestValidator.predicate(
      "strategy is non-empty string",
      typeof item.strategy === "string" && item.strategy.length > 0,
    );
    TestValidator.predicate(
      "sortValue is a number",
      typeof item.sortValue === "number",
    );
    TestValidator.predicate(
      "createdAt is date-time string",
      typeof item.createdAt === "string" && !isNaN(Date.parse(item.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is date-time string",
      typeof item.updatedAt === "string" && !isNaN(Date.parse(item.updatedAt)),
    );
    TestValidator.predicate(
      "deletedAt is either null or date-time string",
      item.deletedAt === null ||
        (typeof item.deletedAt === "string" &&
          !isNaN(Date.parse(item.deletedAt))),
    );
  }
}
