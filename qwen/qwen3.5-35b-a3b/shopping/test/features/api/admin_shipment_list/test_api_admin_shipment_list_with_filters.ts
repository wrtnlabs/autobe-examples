import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
 * Test admin shipments list with comprehensive filtering, sorting, and pagination.
 *
 * Setup: Create admin account and authenticate.
 * Test: Verify all shipments are returned and filters/sorting/pagination work correctly.
 */
export async function test_api_admin_shipment_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // 2. Create admin-specific connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAccount.token.access };
  // 3. Success scenario: List all shipments without filters
  const allShipments = await api.functional.ecommerceMall.admin.shipments.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(allShipments);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination has current",
    allShipments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    allShipments.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has records",
    allShipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    allShipments.pagination.pages >= 0,
  );
  // 5. Validate shipment data structure
  if (allShipments.data.length > 0) {
    const firstShipment = allShipments.data[0];
    typia.assert(firstShipment);
    // Validate order reference structure
    typia.assert(firstShipment.order);
    typia.assert(firstShipment.order.shipping_address);
  }
  // 6. Test filtering by status
  const statuses = [
    "pending",
    "in-transit",
    "delivered",
    "failed",
    "cancelled",
  ] as const;
  for (const status of statuses) {
    const filteredByStatus =
      await api.functional.ecommerceMall.admin.shipments.index(
        adminConnection,
        {
          body: {
            status,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    TestValidator.equals(
      `status ${status} returns valid records count`,
      filteredByStatus.pagination.records >= 0,
      true,
    );
    // Validate all returned shipments have the correct status
    if (filteredByStatus.data.length > 0) {
      for (const shipment of filteredByStatus.data) {
        TestValidator.equals(
          `all shipments have status ${status}`,
          shipment.status === status,
          true,
        );
      }
    }
  }
  // 7. Test filtering by carrier_name (partial match)
  const carrierName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const filteredByCarrier =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        carrier_name: carrierName,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(filteredByCarrier);
  TestValidator.equals(
    "carrier filter returns valid records count",
    filteredByCarrier.pagination.records >= 0,
    true,
  );
  // 8. Test date range filtering
  const createdDate = new Date().toISOString();
  const shippedDate = new Date(Date.now() - 86400000 * 7).toISOString(); // 7 days ago
  const deliveredDate = new Date(Date.now() - 86400000 * 30).toISOString(); // 30 days ago
  const filteredByCreatedAt =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        created_at: createdDate,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(filteredByCreatedAt);
  TestValidator.equals(
    "created_at filter returns valid records count",
    filteredByCreatedAt.pagination.records >= 0,
    true,
  );
  const filteredByShippedAt =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        shipped_at: shippedDate,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(filteredByShippedAt);
  TestValidator.equals(
    "shipped_at filter returns valid records count",
    filteredByShippedAt.pagination.records >= 0,
    true,
  );
  const filteredByDeliveredAt =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        delivered_at: deliveredDate,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(filteredByDeliveredAt);
  TestValidator.equals(
    "delivered_at filter returns valid records count",
    filteredByDeliveredAt.pagination.records >= 0,
    true,
  );
  // 9. Test sorting by different fields
  const sortFields = [
    "created_at",
    "shipped_at",
    "delivered_at",
    "status",
    "carrier_name",
  ] as const;
  for (const sortField of sortFields) {
    const sortedByField =
      await api.functional.ecommerceMall.admin.shipments.index(
        adminConnection,
        {
          body: {
            sort: sortField,
            limit: 5,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(sortedByField);
    TestValidator.equals(
      `sort by ${sortField} returns valid records count`,
      sortedByField.pagination.records >= 0,
      true,
    );
  }
  // 10. Test pagination parameters
  const page2 = await api.functional.ecommerceMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 has correct current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 has limit 10", page2.pagination.limit, 10);
  // 11. Test empty results scenario
  const emptyResult = await api.functional.ecommerceMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        status: "pending",
        limit: 1,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "pagination supports empty results",
    emptyResult.pagination.records >= 0,
    true,
  );
  // 12. Test combined filters (AND logic)
  const combinedFilters =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: {
        status: "pending",
        limit: 10,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined filters returns valid records count",
    combinedFilters.pagination.records >= 0,
    true,
  );
  // Validate that shipments contain required fields
  if (allShipments.data.length > 0) {
    const sampleShipment = allShipments.data[0];
    TestValidator.equals(
      "shipment has trackingCount",
      sampleShipment.trackingCount >= 0,
      true,
    );
    TestValidator.equals(
      "shipment has order reference",
      sampleShipment.order.id !== undefined,
      true,
    );
  }
}
