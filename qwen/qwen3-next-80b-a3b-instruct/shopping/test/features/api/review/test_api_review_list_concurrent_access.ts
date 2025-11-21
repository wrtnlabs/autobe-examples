import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_concurrent_access(
  connection: api.IConnection,
) {
  // Generate a consistent request body for all concurrent requests
  const requestBody = typia.random<IShoppingMallReview.IRequest>();

  // Execute 10 concurrent requests with the same parameters
  const concurrentResponses = await Promise.all(
    ArrayUtil.repeat(10, async () => {
      return await api.functional.shoppingMall.reviews.index(connection, {
        body: requestBody,
      });
    }),
  );

  // Validate that all responses are correctly typed
  for (const response of concurrentResponses) {
    typia.assert<IPageIShoppingMallReview.ISummary>(response);
  }

  // Validate that all responses have the same structure
  const firstResponse = concurrentResponses[0];

  // Verify the pagination structure is consistent across all responses
  for (let i = 1; i < concurrentResponses.length; i++) {
    TestValidator.equals(
      `response ${i} has identical pagination structure as first response`,
      firstResponse.pagination,
      concurrentResponses[i].pagination,
    );
  }

  // Verify all responses have the same number of reviews
  for (let i = 1; i < concurrentResponses.length; i++) {
    TestValidator.equals(
      `response ${i} has the same number of reviews as first response`,
      firstResponse.data.length,
      concurrentResponses[i].data.length,
    );
  }

  // Verify all responses contain identical review data, maintaining consistency under concurrency
  for (let i = 1; i < concurrentResponses.length; i++) {
    TestValidator.equals(
      `response ${i} has identical review data as first response`,
      firstResponse.data,
      concurrentResponses[i].data,
    );
  }
}
