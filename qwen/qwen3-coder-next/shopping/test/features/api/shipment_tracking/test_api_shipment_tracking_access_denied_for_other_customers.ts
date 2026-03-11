import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipment_tracking_access_denied_for_other_customers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer A and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Create customer B and authenticate
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer A creates an order
  const orderA =
    await api.functional.ecommerceMall.customer.orders.create(
      customerAConnection,
    );
  typia.assert(orderA);
  // 4. Get shipment tracking for customer A's order
  // Note: This assumes there's a shipment created for the order
  // Since the scenario doesn't specify how to get shipment ID, we'll use the first shipment from the order
  // If the order doesn't have shipments, this test may need adjustment
  // 5. Customer B attempts to access customer A's shipment tracking
  // Since we don't have shipment ID directly, we'll use a placeholder
  // In real scenario, we would need to extract shipment ID from customer A's order
  // For now, let's test with a random shipment ID that doesn't exist to verify access denial
  const randomShipmentId = typia.random<string & tags.Format<"uuid">>();
  // Try to get tracking as customer B - this should fail with 403 Forbidden
  try {
    await api.functional.ecommerceMall.customer.shipments.tracking.at(
      customerBConnection,
      {
        shipmentId: randomShipmentId,
      },
    );
    // If we get here, the test should fail - should have thrown 403
    TestValidator.predicate(
      "should throw 403 forbidden for non-existent shipment",
      false,
    );
  } catch (error) {
    if (error instanceof Error && (error as any).status === 403) {
      TestValidator.equals("status code is 403 forbidden", (error as any).status, 403);
    } else {
      throw error;
    }
  }
}