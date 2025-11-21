import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_jwt_malformation(
  connection: api.IConnection,
) {
  // Test improper JWT token handling in request headers
  // Verifies that providing invalid JWT tokens on anonymous endpoint does not cause 500 errors or data leakage

  // Create a malformed JWT token - invalid format
  const malformedJwt = "invalid-jwt-token-format";

  // Create baseline response without any authorization header
  const baselineResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: typia.random<IShoppingMallReview.IRequest>(),
    });
  typia.assert(baselineResponse);

  // Create a connection with malformed JWT in headers
  const malformedConn: api.IConnection = {
    ...connection,
    headers: {
      Authorization: malformedJwt,
    },
  };

  // Execute the PATCH request with malformed JWT
  // This should return identical response to baseline since endpoint is anonymous
  const malformedResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(malformedConn, {
      body: typia.random<IShoppingMallReview.IRequest>(),
    });
  typia.assert(malformedResponse);

  // Verify that the response structure is identical between baseline and malformed JWT
  // This confirms that malformed JWT has no effect on the API response
  // and that there's no data leakage or server error
  TestValidator.equals(
    "baseline and malformed JWT responses should be identical",
    baselineResponse,
    malformedResponse,
  );

  // Verify that server didn't return 500 error (we assume the call succeeded)
  // Since typia.assert() was called successfully, the response is valid
  // and no 500 error occurred
}
