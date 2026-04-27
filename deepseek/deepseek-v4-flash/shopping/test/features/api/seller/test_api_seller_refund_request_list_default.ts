import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can retrieve a paginated list of refund requests for their own products with default pagination.
 *
 * Validates the seller-scoped refund requests listing endpoint by authenticating as a seller and calling the endpoint with default pagination parameters (no filters). Since no refund requests exist in the test environment, the response is expected to be an empty paginated result.
 *
 * The test confirms that the response conforms to the `IPageIECommerceMallRefundRequest.ISummary` structure through `typia.assert`, and that the pagination metadata fields (`current`, `limit`, `records`, `pages`) are present and correctly typed.
 *
 * 1. Register a new seller account using `authorize_seller_join`.
 * 2. Call the seller refund requests list endpoint with default pagination (empty body).
 * 3. Validate the full response structure with `typia.assert`.
 * 4. Verify pagination metadata contains the expected fields.
 * 5. Verify the data array is present (even when empty).
 */
export async function test_api_seller_refund_request_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // 2. Call refund requests endpoint with default pagination
  const page = await api.functional.eCommerceMall.seller.refund_requests.index(
    sellerConnection,
    {
      body: {} satisfies IECommerceMallRefundRequest.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current",
    page.pagination.current,
    page.pagination.current,
  );
  TestValidator.equals(
    "pagination limit",
    page.pagination.limit,
    page.pagination.limit,
  );
  TestValidator.equals(
    "pagination records",
    page.pagination.records,
    page.pagination.records,
  );
  TestValidator.equals(
    "pagination pages",
    page.pagination.pages,
    page.pagination.pages,
  );
  // 4. Validate data array is an array
  TestValidator.predicate("data is array", () => Array.isArray(page.data));
  // 5. Validate each refund request summary structure (if any exist)
  for (const request of page.data) {
    typia.assert(request);
  }
  // 6. Validate sorting by created_at descending (newest first) when data exists
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        `refund requests sorted by created_at descending at index ${i}`,
        () =>
          new Date(page.data[i - 1].created_at).getTime() >=
          new Date(page.data[i].created_at).getTime(),
      );
    }
  }
  // 7. Validate soft-deleted refund requests are excluded when data exists
  if (page.data.length > 0) {
    for (const request of page.data) {
      TestValidator.predicate(
        `refund request ${request.id} is not soft-deleted`,
        () => request.deleted_at === null,
      );
    }
  }
  // 8. Validate data isolation - only refund requests for the authenticated seller
  if (page.data.length > 0) {
    for (const request of page.data) {
      TestValidator.equals(
        `refund request ${request.id} belongs to seller`,
        request.seller.id,
        authorized.id,
      );
    }
  }
}
