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
import { generate_random_shopping_mall_customer_shipment_confirmations_create_shipment_confirmation } from "../../../generate/generate_random_shopping_mall_customer_shipment_confirmations_create_shipment_confirmation";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_customer_shipment_confirmation_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test the successful creation of a shipment confirmation by an authenticated customer
  // 1. Register and authenticate a seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      shopName: "Test Seller Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuthorized.email as string & tags.Format<"email">,
      password: "SellerPass123!",
    },
  });
  typia.assert(sellerLoggedIn);
  // 2. Register and authenticate a customer
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "CustomerPass123!",
      },
    },
  );
  typia.assert(customerAuthorized);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoggedIn = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuthorized.email as string & tags.Format<"email">,
        password: "CustomerPass123!",
      },
    },
  );
  typia.assert(customerLoggedIn);
  // 3. Seller creates a shipment with valid orderItemIds (for this test, we generate a shipment randomly with at least one orderItemId)
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        carrierName: "Test Carrier",
        trackingNumber: "TRACK123456",
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()], // The random uuid simulates order item(s)
      },
    },
  );
  typia.assert(shipment);
  // 4. Customer creates a shipment confirmation for the shipment created by seller
  const confirmation =
    await generate_random_shopping_mall_customer_shipment_confirmations_create_shipment_confirmation(
      customerLoginConnection,
      {
        body: {
          shoppingMallShipmentId: shipment.id,
          // optionally provide confirmedAt or omit to use server default
        },
      },
    );
  typia.assert(confirmation);
  // 5. Validations
  TestValidator.equals(
    "shipment id matches",
    confirmation.shoppingMallShipmentId,
    shipment.id,
  );
  TestValidator.predicate(
    "confirmation id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1345][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      confirmation.id,
    ),
  );
  // Validate confirmedAt is recent (within reasonable range)
  const now = new Date();
  const confirmedAt = new Date(confirmation.confirmedAt);
  TestValidator.predicate(
    "confirmedAt is recent",
    Math.abs(now.getTime() - confirmedAt.getTime()) < 5 * 60 * 1000,
  );
  // Validate the shipment snapshot in confirmation
  TestValidator.equals(
    "shipment status preserved",
    confirmation.shipment.status,
    shipment.status,
  );
  // Validate timestamps
  const createdAt = new Date(confirmation.createdAt);
  const updatedAt = new Date(confirmation.updatedAt);
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate("deletedAt is null", confirmation.deletedAt === null);
}
