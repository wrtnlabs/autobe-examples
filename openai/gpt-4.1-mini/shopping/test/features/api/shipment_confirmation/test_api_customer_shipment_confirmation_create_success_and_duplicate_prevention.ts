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

export async function test_api_customer_shipment_confirmation_create_success_and_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller by joining a new account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // Seller creates a shipment
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(shipment);
  // Authenticate as customer by joining a new account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    });
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // Customer submits shipment confirmation with current timestamp
  const confirmationBody: IShoppingMallShipmentConfirmation.ICreate = {
    confirmed_at: new Date().toISOString(),
  };
  const confirmation: IShoppingMallShipmentConfirmation =
    await generate_random_shopping_mall_customer_shipment_confirmations_create(
      customerConnection,
      {
        body: confirmationBody,
      },
    );
  typia.assert(confirmation);
}
