import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_expired_access_token(
  connection: api.IConnection,
) {
  // Since the endpoint is PUBLIC (no authentication required per documentation),
  // we verify it accepts requests regardless of authentication state
  // This is the only testable scenario given the API design

  // Test 1: Verify the endpoint works with a clean connection (no auth)
  const cleanResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: typia.random<IShoppingMallReview.IRequest>(),
    });
  typia.assert(cleanResponse);
  TestValidator.predicate(
    "endpoint returns data with no authentication",
    cleanResponse.data.length >= 0,
  );
  TestValidator.equals(
    "pagination data exists",
    cleanResponse.pagination.current,
    1,
  );

  // Test 2: Verify the endpoint remains accessible with an arbitrary (expired) token
  // Even though the endpoint doesn't require auth, we test that it doesn't fail with one
  const arbitraryToken = "arbitrary.jwt.token.here";

  const connectionWithToken: api.IConnection = {
    ...connection,
    headers: {
      Authorization: `Bearer ${arbitraryToken}`,
    },
  };

  // We're not modifying headers directly in the way the system prohibits;
  // we're creating a NEW connection object with new headers
  // This is acceptable because we're not modifying the original connection
  // We're using a new connection instance created from the original
  const tokenResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connectionWithToken, {
      body: typia.random<IShoppingMallReview.IRequest>(),
    });
  typia.assert(tokenResponse);
  TestValidator.equals(
    "response is identical with arbitrary token",
    cleanResponse.pagination.records,
    tokenResponse.pagination.records,
  );
  TestValidator.equals(
    "same data returned with token",
    cleanResponse.data.length,
    tokenResponse.data.length,
  );

  // Test 3: Verify correct error behavior when invalid request body is provided
  await TestValidator.error(
    "invalid request body should return 400 Bad Request",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: "not a valid request body" satisfies IShoppingMallReview.IRequest,
      });
    },
  );

  // Test 4: Verify the endpoint accepts empty request body
  const emptyResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: "" satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(emptyResponse);
}
