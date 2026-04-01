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
 * Test the administrator's ability to retrieve a paginated list of shipment lifecycle event logs.
 *
 * This test validates:
 * 1. Administrator authentication and access to shipment logs
 * 2. Pagination metadata structure and calculation
 * 3. Log entry structure with required fields (id, eventType, actorType, shipment, createdAt)
 * 4. Event type enum values (created, tracking_updated, delivery_confirmed, auto_delivered)
 * 5. Actor type enum values (customer, seller, administrator, system)
 * 6. Shipment objects contain seller information
 * 7. Filtering capabilities by event_type and actor_type
 * 8. Pagination with different limit values
 */
export async function test_api_shipment_log_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication with unique email
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test default pagination (page=1, limit=20)
  const defaultPagination =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(defaultPagination);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page >= 1",
    defaultPagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    defaultPagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    defaultPagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    defaultPagination.pagination.pages >= 0,
  );
  // 4. Validate log entries structure
  if (defaultPagination.data.length > 0) {
    const firstLog = defaultPagination.data[0];
    // Validate required fields exist
    TestValidator.predicate("log has id", firstLog.id !== undefined);
    TestValidator.predicate(
      "log has eventType",
      firstLog.eventType !== undefined,
    );
    TestValidator.predicate(
      "log has actorType",
      firstLog.actorType !== undefined,
    );
    TestValidator.predicate(
      "log has shipment",
      firstLog.shipment !== undefined,
    );
    TestValidator.predicate(
      "log has createdAt",
      firstLog.createdAt !== undefined,
    );
    // Validate eventType enum values using type-safe comparison
    const isValidEventType =
      firstLog.eventType === "created" ||
      firstLog.eventType === "tracking_updated" ||
      firstLog.eventType === "delivery_confirmed" ||
      firstLog.eventType === "auto_delivered";
    TestValidator.predicate("eventType is valid enum value", isValidEventType);
    // Validate actorType enum values using type-safe comparison
    const isValidActorType =
      firstLog.actorType === "customer" ||
      firstLog.actorType === "seller" ||
      firstLog.actorType === "administrator" ||
      firstLog.actorType === "system";
    TestValidator.predicate("actorType is valid enum value", isValidActorType);
    // Validate shipment contains seller information
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
    TestValidator.predicate(
      "shipment has createdAt",
      firstLog.shipment.createdAt !== undefined,
    );
    // Validate seller information in shipment
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
    // Validate approval_status enum using type-safe comparison
    const isValidApprovalStatus =
      firstLog.shipment.seller.approval_status === "pending" ||
      firstLog.shipment.seller.approval_status === "approved" ||
      firstLog.shipment.seller.approval_status === "rejected";
    TestValidator.predicate(
      "seller approval_status is valid enum value",
      isValidApprovalStatus,
    );
    // Validate system-initiated events have null actorId
    if (firstLog.actorType === "system") {
      TestValidator.equals(
        "system events have null actorId",
        firstLog.actorId,
        null,
      );
    }
    // Validate initial creation events have null oldStatus
    if (firstLog.eventType === "created") {
      TestValidator.equals(
        "creation events have null oldStatus",
        firstLog.oldStatus,
        null,
      );
    }
  }
  // 5. Test pagination with different limit values
  const smallLimit =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(smallLimit);
  TestValidator.equals("small limit respected", smallLimit.pagination.limit, 5);
  TestValidator.predicate("data length <= limit", smallLimit.data.length <= 5);
  // 6. Test filtering by event_type
  const filteredByEventType =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          event_type: "created",
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(filteredByEventType);
  if (filteredByEventType.data.length > 0) {
    TestValidator.predicate(
      "all filtered logs have event_type created",
      filteredByEventType.data.every((log) => log.eventType === "created"),
    );
  }
  // 7. Test filtering by actor_type
  const filteredByActorType =
    await api.functional.shoppingMall.administrator.shipment_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actor_type: "seller",
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(filteredByActorType);
  if (filteredByActorType.data.length > 0) {
    TestValidator.predicate(
      "all filtered logs have actor_type seller",
      filteredByActorType.data.every((log) => log.actorType === "seller"),
    );
  }
  // 8. Test sorting validation (logs should be sorted by createdAt DESC)
  if (defaultPagination.data.length > 1) {
    const isSortedDesc = defaultPagination.data.every((log, index, array) => {
      if (index === 0) return true;
      return (
        new Date(array[index - 1].createdAt).getTime() >=
        new Date(log.createdAt).getTime()
      );
    });
    TestValidator.predicate(
      "logs sorted by createdAt descending",
      isSortedDesc,
    );
  }
}
