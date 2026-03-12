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

/**
 * Test filtering shipments by delivery status (pending, delivered, confirmed).
 *
 * This test validates the shipment filtering functionality by testing different
 * status filters and their combinations. It ensures that the filter correctly
 * interprets database fields (delivered_at, delivery_confirmed) and returns
 * appropriate results for each status type.
 */
export async function test_api_shipment_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Test status='pending': Filter shipments not yet delivered
  const pendingResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "pending",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(pendingResult);
  // Validate all pending shipments have delivered_at = null and delivery_confirmed = false
  for (const shipment of pendingResult.data) {
    TestValidator.equals(
      `pending shipment ${shipment.id} has null delivered_at`,
      shipment.delivered_at,
      null,
    );
    TestValidator.equals(
      `pending shipment ${shipment.id} has delivery_confirmed = false`,
      shipment.delivery_confirmed,
      false,
    );
  }
  // 3. Test status='delivered': Filter shipments delivered but not confirmed
  const deliveredResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "delivered",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(deliveredResult);
  // Validate all delivered shipments have delivered_at not null and delivery_confirmed = false
  for (const shipment of deliveredResult.data) {
    TestValidator.predicate(
      `delivered shipment ${shipment.id} has non-null delivered_at`,
      shipment.delivered_at !== null,
    );
    TestValidator.equals(
      `delivered shipment ${shipment.id} has delivery_confirmed = false`,
      shipment.delivery_confirmed,
      false,
    );
  }
  // 4. Test status='confirmed': Filter shipments with confirmed delivery
  const confirmedResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "confirmed",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(confirmedResult);
  // Validate all confirmed shipments have delivery_confirmed = true and delivered_at not null
  for (const shipment of confirmedResult.data) {
    TestValidator.equals(
      `confirmed shipment ${shipment.id} has delivery_confirmed = true`,
      shipment.delivery_confirmed,
      true,
    );
    TestValidator.predicate(
      `confirmed shipment ${shipment.id} has non-null delivered_at`,
      shipment.delivered_at !== null,
    );
  }
  // 5. Test combined filters: status + tracking_carrier
  const carrierName = RandomGenerator.alphabets(5);
  const combinedResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "pending",
        tracking_carrier: carrierName,
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(combinedResult);
  // Validate combined filter results (may be empty if no matching shipments exist)
  for (const shipment of combinedResult.data) {
    TestValidator.equals(
      `combined filter shipment ${shipment.id} has null delivered_at`,
      shipment.delivered_at,
      null,
    );
    TestValidator.equals(
      `combined filter shipment ${shipment.id} has delivery_confirmed = false`,
      shipment.delivery_confirmed,
      false,
    );
    TestValidator.predicate(
      `combined filter shipment ${shipment.id} matches carrier filter`,
      shipment.tracking_carrier
        .toLowerCase()
        .includes(carrierName.toLowerCase()),
    );
  }
  // 6. Validate pagination metadata reflects filtered count
  TestValidator.predicate(
    "pending pagination records >= data length",
    pendingResult.pagination.records >= pendingResult.data.length,
  );
  TestValidator.predicate(
    "delivered pagination records >= data length",
    deliveredResult.pagination.records >= deliveredResult.data.length,
  );
  TestValidator.predicate(
    "confirmed pagination records >= data length",
    confirmedResult.pagination.records >= confirmedResult.data.length,
  );
  TestValidator.predicate(
    "combined pagination records >= data length",
    combinedResult.pagination.records >= combinedResult.data.length,
  );
  // 7. Validate that empty results are acceptable (no shipments may exist for new seller)
  TestValidator.predicate(
    "pending result has valid structure",
    Array.isArray(pendingResult.data) && pendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "delivered result has valid structure",
    Array.isArray(deliveredResult.data) &&
      deliveredResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "confirmed result has valid structure",
    Array.isArray(confirmedResult.data) &&
      confirmedResult.pagination.current >= 1,
  );
}
