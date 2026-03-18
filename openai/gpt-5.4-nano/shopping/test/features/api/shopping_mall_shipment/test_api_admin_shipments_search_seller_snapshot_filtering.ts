import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_shipments_search_seller_snapshot_filtering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Discover an order with shipments from multiple seller_snapshot_id values
  // by querying shipments for a small page without seller_snapshot_id filter.
  const discovery =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
          // no shopping_mall_order_id / seller_snapshot_id filter here
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(discovery);
  TestValidator.predicate(
    "should return some shipments for discovery",
    discovery.data.length > 0,
  );
  // Choose one order and attempt to find two distinct seller snapshots within it.
  const seed = discovery.data[0]!;
  const orderCode = seed.order.orderCode;
  const orderId = seed.order.id;
  const firstSellerSnapshotId = seed.sellerSnapshotId;
  const sellersInOrder = new Map<string & tags.Format<"uuid">, true>();
  for (const item of discovery.data) {
    if (item.order.id === orderId) {
      sellersInOrder.set(item.sellerSnapshotId, true);
    }
  }
  // If not enough sellers were present in the first page, we fail fast.
  const sellers = Array.from(sellersInOrder.keys());
  TestValidator.predicate(
    "should have at least two distinct seller_snapshot_id values within the same order in the discovered page",
    sellers.length >= 2,
  );
  const sellerSnapshotIdA = firstSellerSnapshotId;
  const sellerSnapshotIdB = sellers.find((s) => s !== sellerSnapshotIdA);
  TestValidator.predicate(
    "should find a second seller_snapshot_id distinct from the first",
    sellerSnapshotIdB !== undefined,
  );
  // Search for shipments filtered by seller_snapshot_id A
  const pageA = await api.functional.shoppingMall.admin.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        shopping_mall_order_id: orderId,
        seller_snapshot_id: sellerSnapshotIdA,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(pageA);
  TestValidator.predicate(
    "pageA should not contain empty results",
    pageA.data.length > 0,
  );
  for (const item of pageA.data) {
    TestValidator.equals(
      "sellerSnapshotId should match requested seller_snapshot_id (A)",
      item.sellerSnapshotId,
      sellerSnapshotIdA,
    );
    TestValidator.equals(
      "orderCode should match the requested order context",
      item.order.orderCode,
      orderCode,
    );
    // Tracking coherence checks: when no trackingUrl, other tracking fields must be null.
    if (item.trackingUrl === null) {
      TestValidator.equals(
        "trackingNumber should be null when trackingUrl is null",
        item.trackingNumber,
        null,
      );
      TestValidator.equals(
        "carrierName should be null when trackingUrl is null",
        item.carrierName,
        null,
      );
      TestValidator.equals(
        "confirmationType should be null when trackingUrl is null",
        item.confirmationType,
        null,
      );
      TestValidator.equals(
        "confirmedAt should be null when trackingUrl is null",
        item.confirmedAt,
        null,
      );
    }
    if (item.trackingNumber !== null) {
      TestValidator.predicate(
        "confirmedAt should be present when trackingNumber is present",
        item.confirmedAt !== null,
      );
    }
  }
  // Search for shipments filtered by seller_snapshot_id B
  const pageB = await api.functional.shoppingMall.admin.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        shopping_mall_order_id: orderId,
        seller_snapshot_id: sellerSnapshotIdB!,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(pageB);
  TestValidator.predicate(
    "pageB should not contain empty results",
    pageB.data.length > 0,
  );
  for (const item of pageB.data) {
    TestValidator.equals(
      "sellerSnapshotId should match requested seller_snapshot_id (B)",
      item.sellerSnapshotId,
      sellerSnapshotIdB!,
    );
    TestValidator.equals(
      "orderCode should match the requested order context",
      item.order.orderCode,
      orderCode,
    );
    if (item.trackingUrl === null) {
      TestValidator.equals(
        "trackingNumber should be null when trackingUrl is null",
        item.trackingNumber,
        null,
      );
      TestValidator.equals(
        "carrierName should be null when trackingUrl is null",
        item.carrierName,
        null,
      );
      TestValidator.equals(
        "confirmationType should be null when trackingUrl is null",
        item.confirmationType,
        null,
      );
      TestValidator.equals(
        "confirmedAt should be null when trackingUrl is null",
        item.confirmedAt,
        null,
      );
    }
    if (item.trackingNumber !== null) {
      TestValidator.predicate(
        "confirmedAt should be present when trackingNumber is present",
        item.confirmedAt !== null,
      );
    }
  }
  // Validate disjointness of shipment id sets between A and B.
  const idsA = new Set(pageA.data.map((d) => d.id));
  const idsB = new Set(pageB.data.map((d) => d.id));
  for (const id of idsA) {
    TestValidator.predicate(
      "shipment id sets for sellerSnapshotId A and B should be disjoint",
      !idsB.has(id),
    );
  }
}
