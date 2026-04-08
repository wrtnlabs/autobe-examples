import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller successfully retrieves refund requests for an order item.
 *
 * Validates that a seller can query and retrieve refund requests associated with their product's order items. The test authenticates as a seller, queries the refund requests endpoint with order and item identifiers, and validates the paginated response contains proper refund request details.
 *
 * The endpoint supports filtering by refund request status and date ranges, with pagination control for large result sets. Response includes pagination metadata and an array of refund request summaries.
 *
 * 1. Seller account is created and authenticated using authorize_seller_join.
 * 2. Generate valid UUIDs for order ID and order item ID.
 * 3. Call the refund requests index endpoint with search criteria.
 * 4. Validates response structure with typia.assert.
 * 5. Verifies pagination metadata and refund request data.
 */
export async function test_api_seller_refund_request_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate order and item IDs
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query refund requests with search criteria
  const refundRequests: IPageIEcommerceRefundRequest.ISummary =
    await api.functional.ecommerce.seller.orders.items.refund_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequests);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    refundRequests.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    refundRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    refundRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    refundRequests.pagination.pages >= 0,
  );
  // 5. Validate refund request data array exists
  TestValidator.predicate(
    "refund requests data is array",
    Array.isArray(refundRequests.data),
  );
}
