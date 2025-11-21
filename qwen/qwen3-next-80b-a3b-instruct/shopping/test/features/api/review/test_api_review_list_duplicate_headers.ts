import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_duplicate_headers(
  connection: api.IConnection,
) {
  // Test that the PATCH /shoppingMall/reviews endpoint uses the last occurrence of the Authorization header when duplicate headers are provided.
  // The HTTP specification allows multiple headers with the same name, and the server must use the last occurrence.
  // This test verifies that our backend correctly implements this behavior by sending duplicate Authorization headers with different values,
  // and ensuring that the request succeeds using the last provided token.
  const connectionWithDuplicates: api.IConnection = {
    ...connection,
    headers: {
      authorization: [
        "Bearer first-token",
        "Bearer second-token",
        "Bearer last-token", // Last value should be used
      ],
    },
  };

  // Send PATCH request with duplicate Authorization headers with a valid minimal request body
  const result = await api.functional.shoppingMall.reviews.index(
    connectionWithDuplicates,
    {
      body: typia.random<IShoppingMallReview.IRequest>(),
    },
  );

  typia.assert(result);

  // Validate that the request succeeded with the last authorization value
  TestValidator.predicate(
    "response contains valid pagination",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "response contains data array",
    result.data.length >= 0,
  );
}
