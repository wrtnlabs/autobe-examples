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

export async function test_api_customer_shipment_confirmation_delete_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Seller creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 3. Setup Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 4. Customer creates a shipment confirmation associated with shipment
  const shipmentConfirmationRaw =
    await generate_random_shopping_mall_customer_shipment_confirmations_create(
      customerConnection,
      {},
    );
  typia.assert(shipmentConfirmationRaw);
  // Cast to IEntity to access .id property safely
  const shipmentConfirmation = shipmentConfirmationRaw as unknown as IEntity;
  // 5. Delete existing shipment confirmation - should return HTTP 204
  await api.functional.shoppingMall.customer.shipment_confirmations.erase(
    customerConnection,
    { confirmationId: shipmentConfirmation.id },
  );
  // 6. Attempt to delete the same shipment confirmation again - expect 404
  await TestValidator.httpError(
    "delete non-existent shipment confirmation",
    404,
    async () =>
      await api.functional.shoppingMall.customer.shipment_confirmations.erase(
        customerConnection,
        { confirmationId: shipmentConfirmation.id },
      ),
  );
  // 7. Attempt to delete a shipment confirmation with a random non-existent confirmationId
  await TestValidator.httpError(
    "delete shipment confirmation with random non-existent id",
    404,
    async () =>
      await api.functional.shoppingMall.customer.shipment_confirmations.erase(
        customerConnection,
        { confirmationId: typia.random<string & tags.Format<"uuid">>() },
      ),
  );
  // 8. Attempt to delete without authentication - expect 401 Unauthorized
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "delete shipment confirmation without authentication",
    401,
    async () =>
      await api.functional.shoppingMall.customer.shipment_confirmations.erase(
        unauthenticatedConnection,
        { confirmationId: typia.random<string & tags.Format<"uuid">>() },
      ),
  );
}
