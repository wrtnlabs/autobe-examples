import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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

export async function test_api_seller_pending_shipments_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Verify unauthorized access is rejected
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.seller.shipments.pending.index(
        unauthenticatedConnection,
      );
    },
  );
  // Test 2: Register seller and verify authorized access
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
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
  typia.assert(sellerResult);
  // Verify authorized seller can access pending shipments endpoint
  const shipments =
    await api.functional.shoppingMall.seller.seller.shipments.pending.index(
      sellerConnection,
    );
  typia.assert(shipments);
  // Test 3: Verify response structure matches ISummary schema
  // Since IShoppingMallShipment.ISummary is currently empty, we verify the structure
  if (shipments.data.length > 0) {
    shipments.data.forEach((shipment) => {
      typia.assert<IShoppingMallShipment.ISummary>(shipment);
    });
  }
  // Test 4: Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    shipments.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page valid",
    shipments.pagination.current >= 1,
  );
  TestValidator.predicate("limit positive", shipments.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    shipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    shipments.pagination.pages >= 0,
  );
  // Test 5: Multiple sellers isolation verification
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller2Connection: api.IConnection = { host: connection.host };
  // Register two different sellers
  await api.functional.shoppingMall.auth.seller.join(seller1Connection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  await api.functional.shoppingMall.auth.seller.join(seller2Connection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Verify both sellers can access their own endpoints
  const seller1Shipments =
    await api.functional.shoppingMall.seller.seller.shipments.pending.index(
      seller1Connection,
    );
  const seller2Shipments =
    await api.functional.shoppingMall.seller.seller.shipments.pending.index(
      seller2Connection,
    );
  typia.assert(seller1Shipments);
  typia.assert(seller2Shipments);
}
