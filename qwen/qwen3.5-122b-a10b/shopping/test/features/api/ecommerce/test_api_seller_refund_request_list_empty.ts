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
 * Test seller refund request list endpoint with empty results.
 *
 * Validates that the seller can query refund requests for an order item and receives a properly structured empty response when no refund requests exist. This ensures the endpoint handles the zero-record case correctly with appropriate pagination metadata.
 *
 * The test authenticates as a seller, queries the refund requests endpoint with randomly generated order and item IDs, and validates that the response contains an empty data array with pagination metadata indicating zero total records.
 *
 * 1. Seller authenticates via join endpoint.
 * 2. Generate random UUIDs for orderId and itemId.
 * 3. Query refund requests endpoint with empty search criteria.
 * 4. Validate response has empty data array.
 * 5. Verify pagination shows records=0, pages=0.
 */
export async function test_api_seller_refund_request_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Generate random UUIDs for order and item (simulating existing order item)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query refund requests endpoint with empty search criteria
  const response: IPageIEcommerceRefundRequest.ISummary =
    await api.functional.ecommerce.seller.orders.items.refund_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {} satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination records is zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    response.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
}
