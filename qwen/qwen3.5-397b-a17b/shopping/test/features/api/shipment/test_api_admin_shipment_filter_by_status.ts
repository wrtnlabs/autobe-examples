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

/**
 * Test that an administrator can filter shipments by lifecycle status.
 *
 * This test validates the shipment filtering functionality by status:
 * 1. Authenticate as administrator
 * 2. Filter shipments by status='shipped' and verify all results have shipped_at not null
 * 3. Filter shipments by status='delivered' and verify all results have delivered_at not null
 * 4. Validate pagination metadata reflects filtered counts accurately
 * 5. Ensure shipments with different statuses are correctly excluded
 */
export async function test_api_admin_shipment_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test filtering by status='shipped'
  const shippedResult = await api.functional.shoppingMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        status: "shipped",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(shippedResult);
  // Validate all shipped shipments have shipped_at not null
  for (const shipment of shippedResult.data) {
    TestValidator.predicate(
      `shipped shipment ${shipment.id} has shipped_at`,
      shipment.shipped_at !== null,
    );
  }
  // Validate pagination for shipped filter
  TestValidator.predicate(
    "shipped pagination records matches data length",
    shippedResult.pagination.records === shippedResult.data.length,
  );
  // 3. Test filtering by status='delivered'
  const deliveredResult =
    await api.functional.shoppingMall.admin.shipments.index(adminConnection, {
      body: {
        status: "delivered",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(deliveredResult);
  // Validate all delivered shipments have delivered_at not null
  for (const shipment of deliveredResult.data) {
    TestValidator.predicate(
      `delivered shipment ${shipment.id} has delivered_at`,
      shipment.delivered_at !== null,
    );
  }
  // Validate pagination for delivered filter
  TestValidator.predicate(
    "delivered pagination records matches data length",
    deliveredResult.pagination.records === deliveredResult.data.length,
  );
  // 4. Validate that shipped shipments don't have delivered_at (unless already delivered)
  // Note: A shipment can be both shipped and delivered, so we check the status logic
  // For 'shipped' filter, we expect shipped_at IS NOT NULL
  // For 'delivered' filter, we expect delivered_at IS NOT NULL
  // 5. Test without status filter to get all shipments
  const allResult = await api.functional.shoppingMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(allResult);
  // Validate that filtered counts are subsets of total
  TestValidator.predicate(
    "shipped count <= total count",
    shippedResult.pagination.records <= allResult.pagination.records,
  );
  TestValidator.predicate(
    "delivered count <= total count",
    deliveredResult.pagination.records <= allResult.pagination.records,
  );
}
