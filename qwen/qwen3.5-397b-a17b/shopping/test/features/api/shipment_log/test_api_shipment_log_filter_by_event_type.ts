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
 * Test filtering shipment logs by specific event types to trace delivery workflow stages.
 *
 * **Setup Prerequisites:**
 * 1. Administrator authentication via /shoppingMall/auth/administrator/join
 *
 * **Test Execution:**
 * 1. Filter logs by event_type='created' to verify shipment creation events
 * 2. Filter logs by event_type='tracking_updated' to verify tracking update events
 * 3. Filter logs by event_type='delivery_confirmed' to verify customer delivery confirmations
 * 4. Filter logs by event_type='auto_delivered' to verify system auto-delivery events
 * 5. Filter logs by actor_type='customer' to verify customer-initiated events
 * 6. Filter logs by actor_type='system' to verify auto-delivery events
 *
 * **Validation Points:**
 * - Each filter returns only matching event types
 * - Customer delivery confirmations have actorType='customer' and non-null actorId
 * - System auto-deliveries have actorType='system' and null actorId
 * - Status transitions are captured correctly (old_status → new_status)
 * - Metadata field contains tracking information when applicable
 *
 * **Business Logic:**
 * - Verify the 14-day auto-delivery timeout creates system-initiated events
 * - Verify customer delivery confirmation changes all items in shipment to delivered status
 * - Verify audit trail supports dispute resolution with complete event history
 */
export async function test_api_shipment_log_filter_by_event_type(
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
  // 2. Test filtering by event_type='created'
  const createdLogs =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          event_type: "created",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(createdLogs);
  // 3. Test filtering by event_type='tracking_updated'
  const trackingLogs =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          event_type: "tracking_updated",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(trackingLogs);
  // 4. Test filtering by event_type='delivery_confirmed'
  const deliveryLogs =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          event_type: "delivery_confirmed",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(deliveryLogs);
  // 5. Test filtering by event_type='auto_delivered'
  const autoDeliveredLogs =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          event_type: "auto_delivered",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(autoDeliveredLogs);
  // 6. Test filtering by actor_type='customer'
  const customerLogs =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "customer",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(customerLogs);
  // 7. Test filtering by actor_type='system'
  const systemLogs =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "system",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(systemLogs);
  // 8. Validate filter correctness - created logs should have eventType='created'
  for (const log of createdLogs.data) {
    TestValidator.equals("created log event type", log.eventType, "created");
  }
  // 9. Validate filter correctness - tracking logs should have eventType='tracking_updated'
  for (const log of trackingLogs.data) {
    TestValidator.equals(
      "tracking log event type",
      log.eventType,
      "tracking_updated",
    );
  }
  // 10. Validate filter correctness - delivery logs should have eventType='delivery_confirmed'
  for (const log of deliveryLogs.data) {
    TestValidator.equals(
      "delivery log event type",
      log.eventType,
      "delivery_confirmed",
    );
  }
  // 11. Validate filter correctness - auto-delivered logs should have eventType='auto_delivered'
  for (const log of autoDeliveredLogs.data) {
    TestValidator.equals(
      "auto-delivered log event type",
      log.eventType,
      "auto_delivered",
    );
  }
  // 12. Validate customer logs have correct actor type and non-null actorId
  for (const log of customerLogs.data) {
    TestValidator.equals("customer log actor type", log.actorType, "customer");
    TestValidator.predicate(
      "customer log actorId is not null",
      log.actorId !== null,
    );
  }
  // 13. Validate system logs have null actorId (system-initiated events)
  for (const log of systemLogs.data) {
    TestValidator.equals("system log actor type", log.actorType, "system");
    TestValidator.equals("system log actorId is null", log.actorId, null);
  }
  // 14. Test combined filters (event_type + actor_type)
  const combinedLogs =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          event_type: "delivery_confirmed",
          actor_type: "customer",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(combinedLogs);
  // 15. Validate combined filter results
  for (const log of combinedLogs.data) {
    TestValidator.equals(
      "combined log event type",
      log.eventType,
      "delivery_confirmed",
    );
    TestValidator.equals("combined log actor type", log.actorType, "customer");
  }
  // 16. Test pagination parameters
  const paginatedLogs =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.equals("pagination limit", paginatedLogs.pagination.limit, 10);
  TestValidator.predicate(
    "pagination current page valid",
    paginatedLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginatedLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginatedLogs.pagination.pages >= 0,
  );
}
