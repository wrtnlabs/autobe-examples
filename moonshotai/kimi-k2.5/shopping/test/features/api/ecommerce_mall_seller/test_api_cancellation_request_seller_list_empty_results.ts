import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that listing cancellation requests for an order item with no requests
 * returns an empty result with proper pagination metadata.
 *
 * This validates the edge case handling where:
 * - No cancellation requests exist for the given order item
 * - The API returns HTTP 200 (not an error)
 * - The response structure maintains IPageIEcommerceMallCancellationRequest.ISummary format
 * - Pagination shows: current=1, records=0, pages=0, limit=as requested
 * - The data array is empty
 */
export async function test_api_cancellation_request_seller_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  // Generate a random order item ID (no cancellation requests should exist for it)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // Request parameters with pagination
  const limit = 10;
  const requestBody: IEcommerceMallCancellationRequest.IRequest = {
    page: 1,
    limit: limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  // Query cancellation requests for order item with no cancellation requests
  const response: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId,
        body: requestBody,
      },
    );
  // Validate response structure and types
  typia.assert(response);
  // Validate empty results
  TestValidator.equals("data array is empty", response.data, []);
  // Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", response.pagination.pages, 0);
}
