import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller to create authentication context
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await api.functional.shoppingMall.auth.seller.join(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(3),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller1);
  seller1Connection.headers = seller1Connection.headers || {};
  seller1Connection.headers.Authorization = seller1.token.access;
  // 2. Register second seller (to test seller-to-seller unauthorized access)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await api.functional.shoppingMall.auth.seller.join(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(3),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller2);
  seller2Connection.headers = seller2Connection.headers || {};
  seller2Connection.headers.Authorization = seller2.token.access;
  // 3. Register customer user
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.shoppingMall.auth.seller.join(
    customerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(2),
        shopDescription: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(customer);
  customerConnection.headers = customerConnection.headers || {};
  customerConnection.headers.Authorization = customer.token.access;
  // 4. Generate a random shipment ID for testing
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Test unauthorized access scenarios
  // 5.1 Customer attempting to access shipment (should be forbidden)
  await TestValidator.error(
    "customer access to shipment forbidden",
    async () => {
      await api.functional.shoppingMall.seller.shipments.getByShipmentid(
        customerConnection,
        { shipmentId },
      );
    },
  );
  // 5.2 Guest user (no authentication) attempting to access shipment
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("guest access to shipment forbidden", async () => {
    await api.functional.shoppingMall.seller.shipments.getByShipmentid(
      guestConnection,
      { shipmentId },
    );
  });
  // 5.3 Seller2 attempting to access seller1's shipment (should be forbidden)
  await TestValidator.error(
    "other seller access to shipment forbidden",
    async () => {
      await api.functional.shoppingMall.seller.shipments.getByShipmentid(
        seller2Connection,
        { shipmentId },
      );
    },
  );
  // 6. Verify seller1 can access their own shipment (positive control)
  const retrievedShipment =
    await api.functional.shoppingMall.seller.shipments.getByShipmentid(
      seller1Connection,
      { shipmentId },
    );
  typia.assert(retrievedShipment);
}
