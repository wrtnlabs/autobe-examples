import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a customer cannot access another customer's shipments.
 * Validates proper authorization boundaries and data isolation between customer accounts.
 *
 * Steps:
 * 1. Authenticate as Customer A
 * 2. Call PATCH /ecommerceMall/customer/shipments to retrieve Customer A's shipments
 * 3. Note the shipment IDs returned
 * 4. Authenticate as Customer B (different customer)
 * 5. Call PATCH /ecommerceMall/customer/shipments to retrieve Customer B's shipments
 * 6. Verify Customer B's results do NOT include Customer A's shipment IDs
 * 7. Verify each customer only sees their own shipments
 */
export async function test_api_customer_shipment_list_authorization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {});
  const customerAId = customerAAuth.id;
  // 2. Get Customer A's shipments
  const customerAShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerAConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(customerAShipments);
  // 3. Get Customer A's shipment IDs
  const customerAShipmentIds = customerAShipments.data.map(
    (shipment) => shipment.id,
  );
  // 4. Authenticate as Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {});
  const customerBId = customerBAuth.id;
  // 5. Get Customer B's shipments
  const customerBShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerBConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(customerBShipments);
  // 6. Verify Customer B's results do NOT include Customer A's shipment IDs
  const customerBShipmentIds = customerBShipments.data.map(
    (shipment) => shipment.id,
  );
  // Check that there's no overlap between Customer A and Customer B shipment IDs
  const overlapIds = customerAShipmentIds.filter((id) =>
    customerBShipmentIds.includes(id),
  );
  TestValidator.equals("no cross-customer data leakage", overlapIds, []);
  // 7. Verify each customer sees only their own shipments
  // Verify Customer A's shipments belong to Customer A
  for (const shipment of customerAShipments.data) {
    TestValidator.equals(
      "shipment order belongs to customer A",
      (shipment.order.customer as unknown as IEntity).id,
      customerAId,
    );
  }
  // Verify Customer B's shipments belong to Customer B
  for (const shipment of customerBShipments.data) {
    TestValidator.equals(
      "shipment order belongs to customer B",
      (shipment.order.customer as unknown as IEntity).id,
      customerBId,
    );
  }
}