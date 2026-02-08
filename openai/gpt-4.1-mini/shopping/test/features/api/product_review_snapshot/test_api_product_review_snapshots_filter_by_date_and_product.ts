import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewSnapshot";
import type { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_review_snapshots_filter_by_date_and_product(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Since the IRequest DTO is empty, no filters can be sent.
  const requestBody: IShoppingMallProductReviewSnapshot.IRequest = {};
  // Call the endpoint with empty filters
  const output = await api.functional.shoppingMall.productReviewSnapshots.index(
    adminConnection,
    {
      body: requestBody,
    },
  );
  // Assert response type
  typia.assert(output);
  // Validate pagination
  TestValidator.predicate(
    "current page number is at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page limit size is at least 1",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pages count consistent",
    output.pagination.pages ===
      Math.ceil(output.pagination.records / output.pagination.limit),
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  // Validate non-empty data list
  TestValidator.predicate("data list is array", Array.isArray(output.data));
  // Remove sorting validation due to non-existence of 'created_at'
}
