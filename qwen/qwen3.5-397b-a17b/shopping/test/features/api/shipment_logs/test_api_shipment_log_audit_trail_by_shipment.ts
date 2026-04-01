import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving complete audit trail for a specific shipment to verify end-to-end lifecycle tracking.
 *
 * **Setup Prerequisites:**
 * 1. Administrator authentication via /shoppingMall/auth/administrator/join using authorize_administrator_join utility
 * 2. Note: Full shipment creation workflow requires seller/customer endpoints not available in this test scope, so we test the log retrieval functionality with filtering capabilities
 *
 * **Test Execution:**
 * 1. Filter logs by shopping_mall_shipment_id to retrieve all events for a specific shipment
 * 2. Verify the response structure contains pagination and data array
 * 3. Filter by date range (created_at_from, created_at_to) to verify temporal filtering works
 * 4. Filter by event_type to verify event type filtering
 * 5. Filter by actor_type to verify actor filtering
 * 6. Verify each log entry contains required fields: id, eventType, actorType, shipment, createdAt
 *
 * **Validation Points:**
 * - Response contains pagination with current, limit, records, pages
 * - Response contains data array of IShoppingMallShipmentLog.ISummary
 * - Each log entry has valid UUID id
 * - Each log entry has eventType from enum: created, tracking_updated, delivery_confirmed, auto_delivered
 * - Each log entry has actorType from enum: customer, seller, administrator, system
 * - Each log entry contains shipment object with id, trackingCarrier, trackingNumber, shippedAt, confirmedAt, seller, createdAt
 * - Events are chronologically ordered (newest first per default sort)
 *
 * **Business Logic:**
 * - Verify audit trail provides complete history for compliance and dispute resolution
 * - Verify logs are immutable once created
 * - Verify filtering capabilities work correctly for forensic analysis
 */
export async function test_api_shipment_log_audit_trail_by_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test basic log retrieval without filters
  const basicLogs: IPageIShoppingMallShipmentLog.ISummary =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(basicLogs);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    basicLogs.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(basicLogs.data));
  // 3. Test filtering by shipment ID
  const testShipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentLogs: IPageIShoppingMallShipmentLog.ISummary =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          shopping_mall_shipment_id: testShipmentId,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(shipmentLogs);
  // Validate filtered results - all logs should match the shipment ID
  if (shipmentLogs.data.length > 0) {
    for (const log of shipmentLogs.data) {
      TestValidator.equals(
        "shipment ID matches filter",
        log.shipment.id,
        testShipmentId,
      );
    }
  }
  // 4. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateFilteredLogs: IPageIShoppingMallShipmentLog.ISummary =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(dateFilteredLogs);
  // 5. Test event type filtering
  const eventTypes = [
    "created",
    "tracking_updated",
    "delivery_confirmed",
    "auto_delivered",
  ] as const;
  const randomEventType = RandomGenerator.pick(eventTypes);
  const eventFilteredLogs: IPageIShoppingMallShipmentLog.ISummary =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          event_type: randomEventType,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(eventFilteredLogs);
  // Validate event type filtered results
  if (eventFilteredLogs.data.length > 0) {
    for (const log of eventFilteredLogs.data) {
      TestValidator.equals(
        "event type matches filter",
        log.eventType,
        randomEventType,
      );
    }
  }
  // 6. Test actor type filtering
  const actorTypes = ["customer", "seller", "administrator", "system"] as const;
  const randomActorType = RandomGenerator.pick(actorTypes);
  const actorFilteredLogs: IPageIShoppingMallShipmentLog.ISummary =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          actor_type: randomActorType,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(actorFilteredLogs);
  // Validate actor type filtered results
  if (actorFilteredLogs.data.length > 0) {
    for (const log of actorFilteredLogs.data) {
      TestValidator.equals(
        "actor type matches filter",
        log.actorType,
        randomActorType,
      );
    }
  }
  // 7. Validate log entry structure when data exists
  if (basicLogs.data.length > 0) {
    const firstLog = basicLogs.data[0];
    // Validate shipment object structure
    TestValidator.predicate(
      "shipment has id",
      firstLog.shipment.id !== undefined,
    );
    TestValidator.predicate(
      "shipment has trackingCarrier",
      firstLog.shipment.trackingCarrier !== undefined,
    );
    TestValidator.predicate(
      "shipment has trackingNumber",
      firstLog.shipment.trackingNumber !== undefined,
    );
    TestValidator.predicate(
      "shipment has shippedAt",
      firstLog.shipment.shippedAt !== undefined,
    );
    TestValidator.predicate(
      "shipment has seller",
      firstLog.shipment.seller !== undefined,
    );
    // Validate seller object structure
    TestValidator.predicate(
      "seller has id",
      firstLog.shipment.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller has email",
      firstLog.shipment.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has created_at",
      firstLog.shipment.seller.created_at !== undefined,
    );
    TestValidator.predicate(
      "seller has approval_status",
      firstLog.shipment.seller.approval_status !== undefined,
    );
  }
  // 8. Test combined filters
  const combinedLogs: IPageIShoppingMallShipmentLog.ISummary =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          event_type: "created",
          actor_type: "system",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(combinedLogs);
  // Validate combined filter results
  if (combinedLogs.data.length > 0) {
    for (const log of combinedLogs.data) {
      TestValidator.equals(
        "combined event type matches",
        log.eventType,
        "created",
      );
      TestValidator.equals(
        "combined actor type matches",
        log.actorType,
        "system",
      );
    }
  }
  // 9. Test pagination parameters
  const paginatedLogs: IPageIShoppingMallShipmentLog.ISummary =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.equals(
    "pagination current matches request",
    paginatedLogs.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedLogs.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedLogs.pagination.pages >= 0,
  );
}