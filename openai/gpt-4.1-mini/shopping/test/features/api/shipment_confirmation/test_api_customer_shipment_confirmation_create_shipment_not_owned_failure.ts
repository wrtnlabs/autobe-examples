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
import { generate_random_shopping_mall_customer_shipment_confirmations_create } from "../../../generate/generate_random_shopping_mall_customer_shipment_confirmations_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_customer_shipment_confirmation_create_shipment_not_owned_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  await authorize_seller_login(sellerConnection, { body: {} });
  // 2. Seller creates shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // Extract shipment id
  // Since IShoppingMallShipment type is empty, try to find 'id' or fallback
  let shipmentId: string | null = null;
  if (typeof shipment === "object" && shipment !== null) {
    if (typeof (shipment as Record<string, any>).id === "string") {
      shipmentId = (shipment as Record<string, any>).id;
    } else {
      for (const key of Object.keys(shipment)) {
        if (
          key.endsWith("_id") &&
          typeof (shipment as Record<string, any>)[key] === "string"
        ) {
          shipmentId = (shipment as Record<string, any>)[key];
          break;
        }
      }
    }
  }
  if (shipmentId === null) throw new Error("Shipment ID property not found");
  // 3. Another customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuthorized);
  await authorize_customer_login(customerConnection, { body: {} });
  // 4. Attempt to confirm shipment with different customer (not owner)
  try {
    await api.functional.shoppingMall.customer.shipment_confirmations.create(
      customerConnection,
      {
        body: {
          shipment_id: shipmentId,
          confirmed_at: new Date().toISOString(),
        } satisfies IShoppingMallShipmentConfirmation.ICreate,
      },
    );
    throw new Error(
      "Expected error for confirming shipment not owned by customer, but succeeded",
    );
  } catch (error) {
    if (!(error instanceof api.HttpError)) throw error;
    const statusForbidden = error.status === 403 || error.status === 400;
    TestValidator.predicate(
      "error status is 403 or 400 for shipment not owned",
      statusForbidden,
    );
    const message =
      typeof error.message === "string"
        ? error.message
        : JSON.stringify(error.message);
    TestValidator.predicate(
      "error message indicates shipment ownership",
      message.includes("ownership") || message.includes("not belong"),
    );
  }
}
