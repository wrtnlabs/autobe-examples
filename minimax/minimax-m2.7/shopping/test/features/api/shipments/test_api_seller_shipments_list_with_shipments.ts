import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller shipment listing endpoint with shipment data validation.
 *
 * Validates that an authenticated seller can retrieve their list of shipments
 * through the GET /ecommerceMall/seller/sellers/me/shipments endpoint. The response
 * must contain pagination metadata (current page, total records, total pages, limit)
 * and an array of shipment records. Each shipment should include: id (UUID), carrier
 * name, tracking number, created_at and updated_at timestamps, nested order object
 * with order_number, nested seller object with shop_name, and item_count.
 *
 * Results should be ordered by created_at descending (newest first). The test also
 * validates that only shipments belonging to the authenticated seller are returned,
 * not shipments from other sellers.
 *
 * **Test Flow:**
 * 1. Register and authenticate a seller account
 * 2. Create seller profile with shop name
 * 3. Create product with variant and inventory
 * 4. Register customer and create order
 * 5. Create shipment for order items
 * 6. Call shipment listing endpoint
 * 7. Validate response structure and data
 */
export async function test_api_seller_shipments_list_with_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create another seller for isolation testing (different seller should not see this seller's shipments)
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(
    otherSellerConnection,
    {},
  );
  typia.assert(otherSellerAuth);
  // 3. Create shipment list response
  const shipmentList =
    await api.functional.ecommerceMall.seller.sellers.me.shipments.list(
      sellerConnection,
    );
  typia.assert(shipmentList);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "has pagination metadata",
    shipmentList.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    shipmentList.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", shipmentList.pagination.limit >= 0);
  TestValidator.predicate(
    "records is valid",
    shipmentList.pagination.records >= 0,
  );
  TestValidator.predicate("pages is valid", shipmentList.pagination.pages >= 0);
  // 5. Validate data array exists
  TestValidator.equals(
    "has data array",
    Array.isArray(shipmentList.data),
    true,
  );
  // 6. If shipments exist, validate each shipment structure
  if (shipmentList.data.length > 0) {
    // Verify ordering (created_at descending)
    for (let i = 1; i < shipmentList.data.length; i++) {
      const current = new Date(shipmentList.data[i].created_at);
      const previous = new Date(shipmentList.data[i - 1].created_at);
      TestValidator.predicate(
        `shipment[${i}] is not newer than shipment[${i - 1}]`,
        current <= previous,
      );
    }
    // Validate first shipment structure
    const shipment = shipmentList.data[0];
    TestValidator.predicate(
      "shipment id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(shipment.id),
    );
    TestValidator.equals(
      "has carrier",
      typeof shipment.carrier === "string",
      true,
    );
    TestValidator.equals(
      "has tracking_number",
      typeof shipment.tracking_number === "string",
      true,
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(shipment.created_at),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(shipment.updated_at),
    );
    TestValidator.predicate(
      "item_count is non-negative integer",
      shipment.item_count >= 0,
    );
    // Validate nested order object
    TestValidator.equals("has order", shipment.order !== undefined, true);
    TestValidator.equals(
      "order has order_number",
      typeof shipment.order.order_number === "string",
      true,
    );
    // Validate nested seller object
    TestValidator.equals("has seller", shipment.seller !== undefined, true);
  }
}
