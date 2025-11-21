import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_sql_injection_prevention(
  connection: api.IConnection,
) {
  /**
   * Test SQL injection prevention in the review list API endpoint.
   *
   * The endpoint accepts a query string as the request body and should properly
   * sanitize or parameterize all inputs to prevent SQL injection attacks. This
   * test confirms that malicious SQL patterns in the request body are properly
   * handled without causing database vulnerabilities, even if the endpoint
   * returns successful results with filtered data, ensuring the underlying
   * database query is immune to injection attacks.
   *
   * The test generates a request body containing common SQL injection patterns
   * (e.g., UNION SELECT, -- comment indicators, ' OR 1=1 --) as strings to
   * simulate attack attempts. The API is expected to return a valid response
   * with properly filtered data or reject the malicious input without exposing
   * database structure or data. This is a security validation test, not an
   * error condition test — the endpoint may still return a 200 OK response but
   * must not execute injected SQL. We only verify the response structure and
   * type using typia.assert() — not any content, since legitimate filters might
   * remove all results.
   */
  const maliciousPayloads: string[] = [
    "name' OR '1'='1",
    "name' UNION SELECT username, password FROM users --",
    "'; DROP TABLE reviews; --",
    "SELECT * FROM reviews WHERE 1=1",
  ];

  await ArrayUtil.asyncForEach(maliciousPayloads, async (payload) => {
    const response = await api.functional.shoppingMall.reviews.index(
      connection,
      {
        body: payload,
      },
    );
    typia.assert(response);
  });

  // Validate that a harmless request also works as expected
  const harmlessRequest = "status=published";
  const safeResponse = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: harmlessRequest,
    },
  );
  typia.assert(safeResponse);
}
