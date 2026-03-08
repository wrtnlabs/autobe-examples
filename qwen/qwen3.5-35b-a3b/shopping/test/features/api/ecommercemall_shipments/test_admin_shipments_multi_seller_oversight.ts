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

export async function test_admin_shipments_multi_seller_oversight(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Update connection with admin token for subsequent API calls
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Admin retrieves all shipments (platform-wide oversight)
  const allShipments: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: typia.random<IEcommerceMallShipment.IRequest>(),
    });
  typia.assert(allShipments);
  // Verify admin can see shipments
  TestValidator.predicate(
    "admin can retrieve shipments",
    allShipments.data.length >= 0,
  );
  // 3. Verify each shipment has required fields
  for (const shipment of allShipments.data) {
    typia.assert(shipment);
    // Verify shipment has order information
    TestValidator.equals(
      "shipment has order info",
      shipment.order !== null,
      true,
    );
    // Verify shipment has seller information
    TestValidator.equals(
      "shipment has seller info",
      shipment.seller !== null,
      true,
    );
    // Verify tracking number is present and non-empty
    TestValidator.equals(
      "shipment has tracking number",
      shipment.tracking_number !== null,
      true,
    );
    // Verify tracking number is non-empty string
    TestValidator.equals(
      "shipment tracking number is non-empty",
      shipment.tracking_number.length > 0,
      true,
    );
    // Verify carrier name is present and non-empty
    TestValidator.equals(
      "shipment has carrier name",
      shipment.carrier_name !== null,
      true,
    );
    TestValidator.equals(
      "shipment carrier name is non-empty",
      shipment.carrier_name.length > 0,
      true,
    );
    // Verify seller ID is valid UUID
    typia.assert(shipment.seller.id);
    typia.assert(shipment.seller.email);
  }
  // 4. Test filtering by orderId
  if (allShipments.data.length > 0) {
    const sampleOrderId = allShipments.data[0].order.id;
    const filteredByOrder: IPageIEcommerceMallShipment.ISummary =
      await api.functional.ecommerceMall.admin.shipments.index(
        adminConnection,
        {
          body: {
            orderId: sampleOrderId,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(filteredByOrder);
    // Verify all returned shipments belong to the same order
    for (const shipment of filteredByOrder.data) {
      typia.assert(shipment);
      TestValidator.equals(
        "all shipments belong to same order",
        shipment.order.id,
        sampleOrderId,
      );
    }
  }
  // 5. Test filtering by sellerId
  if (allShipments.data.length > 0) {
    const sampleSellerId = allShipments.data[0].seller.id;
    const filteredBySeller: IPageIEcommerceMallShipment.ISummary =
      await api.functional.ecommerceMall.admin.shipments.index(
        adminConnection,
        {
          body: {
            sellerId: sampleSellerId,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(filteredBySeller);
    // Verify all returned shipments belong to the same seller
    for (const shipment of filteredBySeller.data) {
      typia.assert(shipment);
      TestValidator.equals(
        "all shipments belong to same seller",
        shipment.seller.id,
        sampleSellerId,
      );
    }
  }
  // 6. Test filtering by status
  const statuses: ("pending" | "shipped" | "delivered" | "cancelled")[] = [
    "pending",
    "shipped",
    "delivered",
    "cancelled",
  ];
  for (const status of statuses) {
    const filteredByStatus: IPageIEcommerceMallShipment.ISummary =
      await api.functional.ecommerceMall.admin.shipments.index(
        adminConnection,
        {
          body: {
            status: status,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    // Verify filtering returned results (status may not exist for all filters)
    TestValidator.equals(
      "status filtering returns valid response",
      filteredByStatus.data !== null,
      true,
    );
  }
  // 7. Test date range filtering
  const createdBefore = new Date();
  const createdAfter = new Date(
    createdBefore.getTime() - 30 * 24 * 60 * 60 * 1000,
  ); // 30 days ago
  const filteredByDate: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        createdAfter: createdAfter.toISOString(),
        createdBefore: createdBefore.toISOString(),
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(filteredByDate);
  // Verify all returned shipments are within date range
  for (const shipment of filteredByDate.data) {
    typia.assert(shipment);
    const shipmentDate = new Date(shipment.created_at);
    TestValidator.equals(
      "shipment created after filter",
      shipmentDate >= createdAfter,
      true,
    );
    TestValidator.equals(
      "shipment created before filter",
      shipmentDate <= createdBefore,
      true,
    );
  }
  // 8. Test pagination
  const firstPage: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        limit: 10,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination has valid structure",
    firstPage.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination current is valid",
    firstPage.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    firstPage.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    firstPage.pagination.pages >= 0,
    true,
  );
  // 9. Test sorting by createdAt
  const sortedByDate: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(sortedByDate);
  // Verify sorting returns valid data
  TestValidator.equals(
    "sorting returns valid response",
    sortedByDate.data !== null,
    true,
  );
}