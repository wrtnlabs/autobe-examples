import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_auto_delivery_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create shipments with various ages using seller shipments index
  const now = new Date();
  // Create shipment older than 14 days (should be auto-confirmed)
  const oldShipment = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        status: "pending",
        created_at_start: new Date(
          now.getTime() - 15 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_end: new Date(
          now.getTime() - 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        page: 1,
        limit: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(oldShipment);
  // Create shipment within 14 days (should NOT be auto-confirmed)
  const recentShipment =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "pending",
        created_at_start: new Date(
          now.getTime() - 13 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_end: new Date(
          now.getTime() - 12 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        page: 1,
        limit: 1,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(recentShipment);
  // 3. Trigger auto-delivery confirmation by calling index with no filters
  const result = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result);
  // 4. Verify auto-confirmation results
  const confirmedShipments = result.data.filter(
    (s) => s.auto_confirmed_at !== null,
  );
  const unconfirmedShipments = result.data.filter(
    (s) => s.auto_confirmed_at === null,
  );
  // Old shipments should be auto-confirmed
  TestValidator.predicate(
    "old shipments auto-confirmed",
    confirmedShipments.length > 0,
  );
  // Recent shipments should NOT be auto-confirmed
  TestValidator.predicate(
    "recent shipments not auto-confirmed",
    unconfirmedShipments.length > 0,
  );
  // 5. Validate specific auto-confirmation logic
  for (const shipment of confirmedShipments) {
    TestValidator.predicate(
      "has auto_confirmed_at",
      shipment.auto_confirmed_at !== null,
    );
    TestValidator.predicate(
      "customer_confirmed_at remains null",
      shipment.customer_confirmed_at === null,
    );
  }
  for (const shipment of unconfirmedShipments) {
    TestValidator.predicate(
      "no auto_confirmed_at yet",
      shipment.auto_confirmed_at === null,
    );
  }
}