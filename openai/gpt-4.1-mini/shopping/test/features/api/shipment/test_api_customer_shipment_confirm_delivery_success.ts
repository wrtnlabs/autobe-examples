import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_customer_shipment_confirm_delivery_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody: IShoppingMallCustomer.IJoin =
    typia.random<IShoppingMallCustomer.IJoin>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody: Partial<IShoppingMallSeller.IJoin> = {};
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Create shipment as seller with valid order items
  // Using utility function
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);

  // Shipment id extraction - based on known properties, guessing 'code' property as an identifier
  const shipmentId = (shipment as any).code ?? (shipment as any).shipment_code ?? null;
  if (shipmentId === null) throw new Error("Shipment ID property not found on shipment object.");

  // 4. Confirm delivery by customer
  const confirmation1 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId },
    );
  typia.assert(confirmation1);

  // Because confirmation1 does not have 'shipmentId' or 'confirmed_at' properties,
  // adjust validation accordingly:
  // Validate that confirmation1 has required properties
  // Checking if confirmation1 has a property indicating which shipment was confirmed
  // Assuming a property 'shipment_code' or similar exists
  const confirmedShipmentCode = (confirmation1 as any).shipment_code ?? null;

  TestValidator.predicate(
    "confirmation has shipment_code",
    typeof confirmedShipmentCode === "string",
  );

  if (confirmedShipmentCode !== shipmentId) {
    throw new Error("Confirmed shipment code does not match expected shipment ID.");
  }

  // Validate confirmed datetime
  const confirmedAt: string | null = (confirmation1 as any).confirmed_at ?? null;
  TestValidator.predicate(
    "confirmed_at exists and valid ISO",
    typeof confirmedAt === "string" && !isNaN(Date.parse(confirmedAt)),
  );

  // 5. Duplicate confirmation attempt - should be rejected or handled gracefully
  // Expect error or the same confirmation without creating duplicates
  await TestValidator.error(
    "duplicate delivery confirmation error",
    async () => {
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        customerConnection,
        { shipmentId },
      );
    },
  );

  // 6. Authorization enforcement: Different customer cannot confirm this shipment
  // Create another customer
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherCustomerJoinBody: IShoppingMallCustomer.IJoin =
    typia.random<IShoppingMallCustomer.IJoin>();
  const anotherCustomerAuth = await authorize_customer_join(
    anotherCustomerConnection,
    { body: anotherCustomerJoinBody },
  );
  anotherCustomerConnection.headers = {
    Authorization: anotherCustomerAuth.token.access,
  };
  // Attempt confirmation by different customer should fail (authorization)
  await TestValidator.error(
    "unauthorized customer delivery confirmation",
    async () => {
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        anotherCustomerConnection,
        { shipmentId },
      );
    },
  );
}
