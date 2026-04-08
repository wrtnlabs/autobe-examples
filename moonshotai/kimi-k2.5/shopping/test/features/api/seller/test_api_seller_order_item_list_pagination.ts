import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller order item list pagination workflow.
 *
 * Validates that a seller can successfully retrieve their order items with pagination support.
 * This test verifies the core business flow where sellers view orders placed for their products
 * with proper data isolation and pagination metadata.
 *
 * **Test Steps:**
 * 1. Authenticate as a seller using the join utility to obtain JWT tokens
 * 2. Call PATCH /ecommerceMall/seller/order-items with pagination parameters
 * 3. Validate response structure and pagination metadata
 * 4. Verify order item summary data includes product, variant, and seller information
 */
export async function test_api_seller_order_item_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorizedSeller);
  // 2. Retrieve paginated order items with default pagination
  const requestBody = {
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const response = await api.functional.ecommerceMall.seller.order_items.index(
    sellerConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(response);
  // 3. Validate pagination structure - business logic validation
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Test with custom pagination parameters
  const customRequestBody = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const customResponse =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: customRequestBody,
      },
    );
  typia.assert(customResponse);
  // 5. Validate custom pagination parameters
  TestValidator.equals(
    "custom pagination limit",
    customResponse.pagination.limit,
    10,
  );
  // 6. Test filtering by status - business validation
  const statusFilterRequest = {
    page: 1,
    limit: 20,
    status: "paid" as const,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const statusResponse =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: statusFilterRequest,
      },
    );
  typia.assert(statusResponse);
  // 7. Validate all returned items match the status filter
  for (const item of statusResponse.data) {
    TestValidator.equals(
      "order item status matches filter",
      item.status,
      "paid",
    );
  }
}
