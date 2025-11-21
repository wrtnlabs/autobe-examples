import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_malformed_uuid(
  connection: api.IConnection,
) {
  // Test PATCH /shoppingMall/reviews with malformed UUID in the request body
  // UUID validation should reject improperly formatted strings (e.g., letters outside a-f range)

  // Create a malformed UUID with invalid characters (g-h, i-j, k-l, etc.)
  const malformedUuid = "g1h2i3j4-k5l6m7n8-o9p0q1r2-s3t4u5v6";

  // Declare the request body with malformed UUID
  // Note: IRequest is string & tags.Format<"uuid"> per DTO definition
  // But we are deliberately testing invalid format
  const requestBody = malformedUuid satisfies string as string;

  // Test that API rejects malformed UUID
  await TestValidator.error("malformed UUID should be rejected", async () => {
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestBody,
    });
  });
}
