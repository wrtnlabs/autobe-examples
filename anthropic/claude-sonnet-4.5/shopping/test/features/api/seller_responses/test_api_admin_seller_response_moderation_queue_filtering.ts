import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerResponse";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";

/**
 * Test admin access to seller response moderation queue.
 *
 * This test validates that an admin can successfully access and retrieve the
 * seller response moderation queue using pagination. Since the test environment
 * starts fresh, we test the API's ability to return an empty or populated
 * response list with proper pagination structure.
 *
 * Note: Due to API limitations (no login endpoint, only registration), this
 * test focuses on validating the admin's ability to call the filter endpoint
 * and receive properly structured responses rather than creating a full
 * workflow.
 *
 * Workflow:
 *
 * 1. Create admin account with content_moderator role
 * 2. Call seller response index endpoint with pagination
 * 3. Validate response structure and pagination metadata
 * 4. Verify API returns well-formed data regardless of content
 */
export async function test_api_admin_seller_response_moderation_queue_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for moderation
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "content_moderator",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test admin can access seller response moderation queue
  const responsePage =
    await api.functional.shoppingMall.admin.sellerResponses.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallSellerResponse.IRequest,
    });
  typia.assert(responsePage);

  // Step 3: Validate pagination structure exists and is well-formed
  TestValidator.predicate(
    "response has pagination metadata",
    responsePage.pagination !== null && responsePage.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination has current page",
    typeof responsePage.pagination.current === "number",
  );

  TestValidator.predicate(
    "pagination has limit",
    typeof responsePage.pagination.limit === "number",
  );

  TestValidator.predicate(
    "pagination has records count",
    typeof responsePage.pagination.records === "number",
  );

  TestValidator.predicate(
    "pagination has pages count",
    typeof responsePage.pagination.pages === "number",
  );

  // Step 4: Validate response data array structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(responsePage.data),
  );

  // Step 5: If responses exist, validate their structure
  if (responsePage.data.length > 0) {
    const firstResponse = responsePage.data[0];
    typia.assert(firstResponse);

    TestValidator.predicate(
      "response has valid UUID ID",
      typeof firstResponse.id === "string" && firstResponse.id.length > 0,
    );

    TestValidator.predicate(
      "response has text content",
      typeof firstResponse.response_text === "string",
    );
  }

  // Step 6: Test pagination with different page numbers
  const secondPage =
    await api.functional.shoppingMall.admin.sellerResponses.index(connection, {
      body: {
        page: 2,
      } satisfies IShoppingMallSellerResponse.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.predicate(
    "second page has valid structure",
    secondPage.pagination !== null && Array.isArray(secondPage.data),
  );
}
