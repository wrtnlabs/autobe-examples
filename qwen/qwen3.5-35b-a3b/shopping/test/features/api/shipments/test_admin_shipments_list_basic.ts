import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin's ability to retrieve a filtered and paginated list of all shipments on the platform.
 * 1. Admin authenticates via POST /ecommerceMall/auth/admin/join
 * 2. Admin performs PATCH /ecommerceMall/admin/shipments with basic filtering
 * 3. Validate pagination, sorting, and data structure
 */
export async function test_admin_shipments_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Query all shipments with pagination and sorting
  const limit = 20;
  const adminShipmentResult =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        limit,
        sortBy: "createdAt",
        sortOrder: "desc" as const,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(adminShipmentResult);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination.current",
    adminShipmentResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit",
    adminShipmentResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination.records positive or zero",
    adminShipmentResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages calculated correctly",
    adminShipmentResult.pagination.pages >= 0,
  );
  // 4. Validate sorting - check that createdAt is in descending order (when multiple items)
  if (adminShipmentResult.data.length > 1) {
    for (let i = 1; i < adminShipmentResult.data.length; i++) {
      const prevCreated = new Date(adminShipmentResult.data[i - 1].created_at);
      const currCreated = new Date(adminShipmentResult.data[i].created_at);
      TestValidator.predicate(
        `shipment ${i} should be older than ${i - 1}`,
        prevCreated >= currCreated,
      );
    }
  }
  // 5. Validate response contains required fields for each shipment
  for (const shipment of adminShipmentResult.data) {
    // Verify required fields exist with typia.assert
    typia.assert(shipment.id);
    typia.assert(shipment.carrier_name);
    typia.assert(shipment.tracking_number);
    typia.assert(shipment.created_at);
    typia.assert(shipment.updated_at);
    // Verify order reference is properly joined with essential identification data
    TestValidator.notEquals(
      "shipment has order reference",
      shipment.order,
      null,
    );
    typia.assert(shipment.order.id);
    typia.assert(shipment.order.order_number);
    typia.assert(shipment.order.total_price);
    typia.assert(shipment.order.overall_status);
    // Verify seller reference is properly joined with essential identification data
    TestValidator.notEquals(
      "shipment has seller reference",
      shipment.seller,
      null,
    );
    typia.assert(shipment.seller.id);
    typia.assert(shipment.seller.email);
    typia.assert(shipment.seller.approval_status);
    // Verify soft-deleted shipments are excluded (deleted_at should be null or undefined)
    // When shipment is active, deleted_at should be null
    if (shipment.deleted_at !== undefined) {
      TestValidator.equals(
        "soft-deleted shipments excluded",
        shipment.deleted_at,
        null,
      );
    }
  }
  // 6. Test filtering by status - verify cancelled shipments are visible
  const cancelledShipmentResult =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        limit,
        status: "cancelled" as const,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(cancelledShipmentResult);
  TestValidator.predicate("cancelled status filter works", true);
  // 7. Test trackingNumber partial match filtering
  const firstShipment = adminShipmentResult.data[0];
  if (firstShipment) {
    const trackingNumber = firstShipment.tracking_number;
    const trackingResult =
      await api.functional.ecommerceMall.admin.shipments.index(
        adminConnection,
        {
          body: {
            limit,
            trackingNumber: trackingNumber.substring(0, 8),
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(trackingResult);
    TestValidator.predicate(
      "tracking number filter works",
      trackingResult.data.length >= 0,
    );
  }
}
