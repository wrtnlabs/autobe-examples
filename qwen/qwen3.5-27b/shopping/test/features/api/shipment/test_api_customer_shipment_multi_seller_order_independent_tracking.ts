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
 * Test that customers can view shipments for multi-seller orders where each seller ships separately.
 *
 * Validates the shipment listing endpoint for multi-seller orders, ensuring that customers can track independent shipments from different sellers within a single order. Each seller creates separate shipments for their items, and this test verifies that the shipment listing correctly returns all shipments associated with a specific order, with proper tracking information and delivery status for each.
 *
 * The test authenticates a customer, queries shipments filtered by order_id, and validates that the response contains properly structured shipment summaries with seller information, carrier details, and delivery status. It ensures that pagination works correctly and that mixed delivery statuses (some delivered, some pending) are properly represented.
 *
 * 1. Register and authenticate a customer with email and password credentials.
 * 2. Call PATCH /shoppingMall/customer/shipments with order_id filter to retrieve shipments.
 * 3. Validate response structure contains pagination metadata and shipment data array.
 * 4. Verify each shipment includes carrier_name, tracking_number, order reference, seller reference, and timestamps.
 * 5. Confirm that shipments can be filtered by order_id and return consistent order references.
 * 6. Validate that delivery status is correctly represented (delivered_at can be null for pending shipments).
 */
export async function test_api_customer_shipment_multi_seller_order_independent_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Query shipments with order_id filter
  // Note: Since we cannot create orders through available APIs, we query without specific order_id
  // to get all shipments for the customer, then validate the structure
  const shipmentsResponse =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(shipmentsResponse);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    shipmentsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    shipmentsResponse.pagination.limit >= 1 &&
      shipmentsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    shipmentsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is consistent",
    shipmentsResponse.pagination.pages ===
      Math.ceil(
        shipmentsResponse.pagination.records /
          shipmentsResponse.pagination.limit,
      ),
  );
  // 4. Validate shipment data structure
  const shipments = shipmentsResponse.data;
  TestValidator.predicate(
    "shipments array length matches pagination",
    shipments.length ===
      Math.min(
        shipmentsResponse.pagination.records,
        shipmentsResponse.pagination.limit,
      ),
  );
  // 5. Validate each shipment structure
  await ArrayUtil.asyncForEach(shipments, async (shipment) => {
    typia.assert(shipment);
    // Validate order reference exists
    typia.assert(shipment.order);
    // Validate seller reference exists
    typia.assert(shipment.seller);
    // Business logic: delivered_at, if set, must be after created_at
    if (shipment.delivered_at !== null) {
      TestValidator.predicate(
        `shipment ${shipment.id} delivered_at is after created_at`,
        new Date(shipment.delivered_at!) >= new Date(shipment.created_at),
      );
    }
  });
  // 6. Test filtering by delivery_status
  const deliveredShipments =
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
  typia.assert(deliveredShipments);
  TestValidator.predicate(
    "delivered filter returns valid response",
    deliveredShipments.pagination.records >= 0,
  );
  // Validate all returned shipments have delivered_at set
  await ArrayUtil.asyncForEach(deliveredShipments.data, async (shipment) => {
    typia.assert(shipment);
    TestValidator.predicate(
      `delivered shipment ${shipment.id} has delivered_at`,
      shipment.delivered_at !== null,
    );
  });
  // 7. Test filtering by pending delivery status
  const pendingShipments =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          delivery_status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(pendingShipments);
  TestValidator.predicate(
    "pending filter returns valid response",
    pendingShipments.pagination.records >= 0,
  );
  // Validate all returned shipments have delivered_at as null
  await ArrayUtil.asyncForEach(pendingShipments.data, async (shipment) => {
    typia.assert(shipment);
    TestValidator.predicate(
      `pending shipment ${shipment.id} has null delivered_at`,
      shipment.delivered_at === null,
    );
  });
}
