import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer shipment filtering by order ID with complete detail validation.
 *
 * Validates that the shipment listing endpoint correctly filters shipments by order ID and returns properly structured pagination information when no matching shipments exist. Tests the complete response structure including nested order and seller summary objects when data is present.
 *
 * The test verifies that filtering by a non-existent order ID returns an empty result set with correct pagination metadata (records: 0, pages: 0). This ensures the filtering logic works correctly and the API handles edge cases gracefully.
 *
 * 1. Register and authenticate as a customer using authorize_customer_join utility
 * 2. Create a customer-specific connection for authenticated API calls
 * 3. Call PATCH /shoppingMall/customer/shipments with order_id filter for a non-existent order
 * 4. Verify response structure with typia.assert for complete type validation
 * 5. Validate pagination shows records: 0 and pages: 0 for empty results
 * 6. Verify data array is empty
 * 7. Test additional filter (delivery_status) to ensure endpoint functionality
 */
export async function test_api_customer_shipment_order_filter_with_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Generate a non-existent order ID for filtering test
  const nonExistentOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test filtering by non-existent order ID
  const emptyResult =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          order_id: nonExistentOrderId,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 4. Validate empty response pagination
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  // 5. Test with delivery_status filter (pending)
  const pendingFilterResult =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          delivery_status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  // 6. Validate pagination structure for pending filter
  TestValidator.predicate(
    "pending filter pagination current is positive",
    pendingFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pending filter pagination limit is positive",
    pendingFilterResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pending filter pagination records is non-negative",
    pendingFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending filter pagination pages is non-negative",
    pendingFilterResult.pagination.pages >= 0,
  );
  // 7. Test with delivered status filter
  const deliveredFilterResult =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          delivery_status: "delivered",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(deliveredFilterResult);
  // 8. Validate delivered filter response structure
  TestValidator.equals(
    "delivered filter limit matches request",
    deliveredFilterResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "delivered filter current page is 1",
    deliveredFilterResult.pagination.current,
    1,
  );
}
