import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_invalid_token_format(
  connection: api.IConnection,
) {
  // Create a connection with invalid Authorization header format
  const invalidConn: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      authorization: "InvalidTokenFormat123",
    },
  };

  // Try to make a request with invalid token format - should fail with 401
  await TestValidator.error(
    "invalid token format should return 401 Unauthorized",
    async () => {
      await api.functional.shoppingMall.reviews.index(invalidConn, {
        body: "" satisfies IShoppingMallReview.IRequest,
      });
    },
  );
}
