import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller refund request filtering by pending status.
 *
 * Validates that an authenticated seller can filter their refund requests to view only those awaiting review. The test authenticates a seller, then queries the refund request listing endpoint with the status filter set to "pending".
 *
 * Every returned refund request is validated to have status exactly "pending" — no "approved" or "rejected" requests appear in the filtered results. Each pending request must also have a null responded_at since the seller has not yet taken action. Pagination metadata is validated for consistency with the filtered result set.
 *
 * 1. Seller authenticates via authorize_seller_join.
 * 2. Seller queries refund requests with status "pending" filter.
 * 3. Validates all returned requests have status "pending" and responded_at is null.
 * 4. Validates pagination metadata consistency.
 */
export async function test_api_refund_request_seller_filter_by_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Query refund requests filtered by "pending" status
  const page = await api.functional.shoppingMall.seller.refund_requests.index(
    sellerConnection,
    {
      body: {
        status: "pending",
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate every returned request has "pending" status and null responded_at
  for (const request of page.data) {
    TestValidator.equals("status is pending", request.status, "pending");
    TestValidator.equals(
      "responded_at is null for pending requests",
      request.responded_at,
      null,
    );
  }
  // 4. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination records covers data length",
    page.pagination.records >= page.data.length,
  );
}
