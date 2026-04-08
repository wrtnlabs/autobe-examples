import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test administrator platform-wide shipment listing with pagination.
 *
 * Validates the complete shipment listing workflow including administrator authentication, paginated shipment retrieval, and response structure validation. Ensures that administrators can view all shipments across the platform regardless of seller or customer.
 *
 * Special attention is given to verifying that the pagination metadata is correct and that shipment summaries include all required nested fields (order, seller) with proper data structure.
 *
 * 1. Administrator account is created and authenticated via join endpoint.
 * 2. Administrator calls shipment list endpoint with default pagination parameters.
 * 3. Validates response structure including pagination metadata and shipment data array.
 * 4. Verifies each shipment contains required fields: id, carrier_name, tracking_number, shipped_at, delivered_at, created_at, order, seller, order_items_count.
 * 5. Confirms order and seller nested objects contain expected summary fields.
 */
export async function test_api_admin_shipment_list_all_platform_overview(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve shipment list with default pagination
  const shipmentList =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(shipmentList);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    shipmentList.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is within range",
    shipmentList.pagination.limit >= 1 && shipmentList.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    shipmentList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    shipmentList.pagination.pages >= 0,
  );
  // 4. Validate pagination consistency
  const expectedPages =
    shipmentList.pagination.records === 0
      ? 0
      : Math.ceil(
          shipmentList.pagination.records / shipmentList.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation matches",
    shipmentList.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array length matches current page expectations
  TestValidator.predicate(
    "data array length within limit",
    shipmentList.data.length <= shipmentList.pagination.limit,
  );
  TestValidator.predicate(
    "data array length non-negative",
    shipmentList.data.length >= 0,
  );
  // 6. Validate each shipment summary structure (typia.assert already validated types)
  for (const shipment of shipmentList.data) {
    // Validate nested order summary exists with required fields
    TestValidator.predicate(
      "order object exists",
      shipment.order !== null && shipment.order !== undefined,
    );
    TestValidator.predicate("order has id", shipment.order.id !== undefined);
    TestValidator.predicate(
      "order has code",
      shipment.order.code !== undefined,
    );
    TestValidator.predicate(
      "order has total_price",
      shipment.order.total_price !== undefined,
    );
    TestValidator.predicate(
      "order has created_at",
      shipment.order.created_at !== undefined,
    );
    TestValidator.predicate(
      "order has member",
      shipment.order.member !== null && shipment.order.member !== undefined,
    );
    TestValidator.predicate(
      "order has status",
      shipment.order.status !== undefined,
    );
    TestValidator.predicate(
      "order has items_count",
      shipment.order.items_count !== undefined,
    );
    // Validate nested order member fields
    TestValidator.predicate(
      "order member has id",
      shipment.order.member.id !== undefined,
    );
    TestValidator.predicate(
      "order member has email",
      shipment.order.member.email !== undefined,
    );
    TestValidator.predicate(
      "order member has status",
      shipment.order.member.status !== undefined,
    );
    // Validate nested seller summary exists with required fields
    TestValidator.predicate(
      "seller object exists",
      shipment.seller !== null && shipment.seller !== undefined,
    );
    TestValidator.predicate("seller has id", shipment.seller.id !== undefined);
    TestValidator.predicate(
      "seller has email",
      shipment.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has approvalStatus",
      shipment.seller.approvalStatus !== undefined,
    );
    TestValidator.predicate(
      "seller has rejectionReason",
      shipment.seller.rejectionReason !== undefined,
    );
    TestValidator.predicate(
      "seller has createdAt",
      shipment.seller.createdAt !== undefined,
    );
    TestValidator.predicate(
      "seller has updatedAt",
      shipment.seller.updatedAt !== undefined,
    );
    // Validate shipment core fields exist
    TestValidator.predicate(
      "shipment has carrier_name",
      shipment.carrier_name !== undefined,
    );
    TestValidator.predicate(
      "shipment has tracking_number",
      shipment.tracking_number !== undefined,
    );
    TestValidator.predicate(
      "shipment has shipped_at",
      shipment.shipped_at !== undefined,
    );
    TestValidator.predicate(
      "shipment has created_at",
      shipment.created_at !== undefined,
    );
    TestValidator.predicate(
      "shipment has order_items_count",
      shipment.order_items_count !== undefined,
    );
  }
}
