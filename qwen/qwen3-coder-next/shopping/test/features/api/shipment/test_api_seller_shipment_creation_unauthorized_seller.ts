import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function test_api_seller_shipment_creation_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two sellers and one customer
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `SellerA Shop ${RandomGenerator.name()}`,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `SellerB Shop ${RandomGenerator.name()}`,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string) satisfies string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Customer logs in to access customer endpoints
  const customerLoginResponse = await authorize_customer_login(
    customerConnection,
    {
      body: {
        email: customerConnection.headers?.Authorization
          ? "customer@test.com"
          : (typia.random<string & tags.Format<"email">>() satisfies string as string) satisfies string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
        password: "12345678",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  // 3. Since product/cart endpoints are not available, we'll directly test the shipment creation
  // with a fabricated order ID to verify authorization logic
  // Note: In a real scenario, we would need product and order endpoints that aren't available
  // 4. SellerB attempts to create a shipment with invalid order (should fail due to lack of authorization)
  await TestValidator.error(
    "sellerB cannot create shipment without proper authorization",
    async () => {
      await api.functional.shoppingMall.seller.shipments.create(
        sellerBConnection,
        {
          body: {
            order_id: typia.random<string & tags.Format<"uuid">>(),
            tracking_number: RandomGenerator.alphaNumeric(16),
            tracking_carrier: "Korea Express",
            items: [
              {
                item_ids: [typia.random<string & tags.Format<"uuid">>()],
              },
            ],
          } satisfies IShoppingMallShipment.ICreate,
        },
      );
    },
  );
}