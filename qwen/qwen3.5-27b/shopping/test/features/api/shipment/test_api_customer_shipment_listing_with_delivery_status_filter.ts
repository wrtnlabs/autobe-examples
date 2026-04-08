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
 * Test customer shipment listing with delivery status filtering functionality.
 *
 * Validates that authenticated customers can retrieve their shipments filtered by delivery status (pending or delivered). The test verifies the filtering logic correctly separates shipments based on the delivered_at field, ensures proper response structure with pagination metadata, and confirms that each shipment contains all required information including carrier details, tracking numbers, order references, and seller information.
 *
 * This test focuses on the filtering mechanism and response validation rather than shipment creation, as it assumes pre-existing shipment data in the system from prior order and fulfillment operations.
 *
 * 1. Register and authenticate a customer account.
 * 2. Request shipments with delivery_status='pending' filter.
 * 3. Validate response structure and pagination metadata.
 * 4. Verify all returned shipments have delivered_at = null.
 * 5. Request shipments with delivery_status='delivered' filter.
 * 6. Validate response structure and pagination metadata.
 * 7. Verify all returned shipments have delivered_at != null.
 * 8. Confirm each shipment contains required fields (id, carrier_name, tracking_number, order, seller, created_at, delivered_at).
 */
export async function test_api_customer_shipment_listing_with_delivery_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test pending shipments filter
  const pendingResponse =
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
  typia.assert(pendingResponse);
  // 3. Validate pending response structure
  TestValidator.equals(
    "pending pagination present",
    pendingResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pending pagination current page",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pending pagination limit valid",
    pendingResponse.pagination.limit >= 1 &&
      pendingResponse.pagination.limit <= 100,
  );
  // 4. Verify all pending shipments have delivered_at = null
  await ArrayUtil.asyncForEach(pendingResponse.data, async (shipment) => {
    typia.assert(shipment);
    TestValidator.equals(
      `shipment ${shipment.id} delivered_at is null for pending`,
      shipment.delivered_at,
      null,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has carrier_name`,
      shipment.carrier_name !== undefined && shipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has tracking_number`,
      shipment.tracking_number !== undefined &&
        shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has order`,
      shipment.order !== undefined,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has seller`,
      shipment.seller !== undefined,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has created_at`,
      shipment.created_at !== undefined,
    );
  });
  // 5. Test delivered shipments filter
  const deliveredResponse =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          delivery_status: "delivered",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(deliveredResponse);
  // 6. Validate delivered response structure
  TestValidator.equals(
    "delivered pagination present",
    deliveredResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "delivered pagination current page",
    deliveredResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "delivered pagination limit valid",
    deliveredResponse.pagination.limit >= 1 &&
      deliveredResponse.pagination.limit <= 100,
  );
  // 7. Verify all delivered shipments have delivered_at != null
  await ArrayUtil.asyncForEach(deliveredResponse.data, async (shipment) => {
    typia.assert(shipment);
    TestValidator.predicate(
      `shipment ${shipment.id} delivered_at is not null for delivered`,
      shipment.delivered_at !== null,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has carrier_name`,
      shipment.carrier_name !== undefined && shipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has tracking_number`,
      shipment.tracking_number !== undefined &&
        shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has order`,
      shipment.order !== undefined,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has seller`,
      shipment.seller !== undefined,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has created_at`,
      shipment.created_at !== undefined,
    );
  });
  // 8. Verify pagination metadata correctness for both responses
  TestValidator.predicate(
    "pending records count matches data length or limit",
    pendingResponse.pagination.records >= pendingResponse.data.length,
  );
  TestValidator.predicate(
    "delivered records count matches data length or limit",
    deliveredResponse.pagination.records >= deliveredResponse.data.length,
  );
  TestValidator.predicate(
    "pending pages calculation correct",
    pendingResponse.pagination.pages ===
      Math.ceil(
        pendingResponse.pagination.records / pendingResponse.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "delivered pages calculation correct",
    deliveredResponse.pagination.pages ===
      Math.ceil(
        deliveredResponse.pagination.records /
          deliveredResponse.pagination.limit,
      ),
  );
}
