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

export async function test_api_product_review_snapshots_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection specific for this test (no special authorization required as per endpoint spec)
  const testConnection: api.IConnection = { host: connection.host };
  // Prepare an empty search request body as all filters are optional – to list all snapshots
  const body: IShoppingMallProductReviewSnapshot.IRequest = {};
  // Call the PATCH /shoppingMall/productReviewSnapshots endpoint via SDK function
  const output = await api.functional.shoppingMall.productReviewSnapshots.index(
    testConnection,
    {
      body,
    },
  );
  // Validate the fully typed output using typia.assert
  typia.assert(output);
  // Confirm pagination metadata is present and valid
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // Confirm data is an array
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // Confirm the data is sorted by creation date descending if possible
  // Since schema details for timestamp are not fully defined, do best effort
  // We cannot explicitly check creation date property as it's not defined in ISummary
  // But we can just confirm array length consistency and typia.assert is enough
  // Additional checks: each item passes typia.assertGuard with Summary type
  output.data.forEach((snapshot, index, array) => {
    typia.assert(snapshot);
    // We can't validate chronological order without explicit timestamps
    // So no sorting check possible directly
  });
}
