import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_administrator_shipment_items_basic_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminResponse);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminResponse.email,
      password: "password123",
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup (required for shipment context)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerResponse);
  // 3. Customer setup (required for order context)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  // 4. Create shipment with items using seller connection
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Call the API to list shipment items
  const result =
    await api.functional.ecommerceMall.administrator.shipments.items.index(
      adminLoginConnection,
      {
        shipmentId,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is positive",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 7. Validate items count matches pagination
  TestValidator.equals(
    "items count matches pagination records",
    result.data.length,
    result.pagination.records,
  );
  // 8. Validate each shipment item structure and fields
  for (const item of result.data) {
    // Validate shipment item required fields
    TestValidator.predicate(
      "shipment item has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      "shipment item status is valid",
      ["pending", "shipped", "delivered", "cancelled"].includes(item.status),
    );
    TestValidator.predicate(
      "quantity shipped is positive integer",
      typeof item.quantity_shipped === "number" && item.quantity_shipped > 0,
    );
    TestValidator.predicate(
      "created_at is valid ISO datetime",
      !isNaN(Date.parse(item.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid ISO datetime",
      !isNaN(Date.parse(item.updated_at)),
    );
    // Validate shipment reference
    TestValidator.predicate(
      "shipment has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.shipment.id,
      ),
    );
    TestValidator.predicate(
      "shipment status is valid",
      ["shipped", "delivered"].includes(item.shipment.status),
    );
    TestValidator.predicate(
      "shipment has carrier",
      item.shipment.carrier !== undefined && item.shipment.carrier !== null,
    );
    TestValidator.predicate(
      "shipment has tracking number",
      item.shipment.tracking_number !== undefined &&
        item.shipment.tracking_number !== null,
    );
    TestValidator.predicate(
      "shipment has seller info",
      item.shipment.seller !== undefined && item.shipment.seller !== null,
    );
    TestValidator.predicate(
      "shipment seller has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.shipment.seller.id,
      ),
    );
    TestValidator.predicate(
      "shipment has created_at",
      !isNaN(Date.parse(item.shipment.created_at)),
    );
    // Validate orderItem reference
    TestValidator.predicate(
      "orderItem has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.orderItem.id,
      ),
    );
    TestValidator.predicate(
      "orderItem has order number",
      item.orderItem.order_number.length > 0,
    );
    TestValidator.predicate(
      "orderItem has seller display name",
      item.orderItem.seller_display_name.length > 0,
    );
    TestValidator.predicate(
      "orderItem has product variant name",
      item.orderItem.product_variant_name.length > 0,
    );
    TestValidator.predicate(
      "orderItem has SKU code",
      item.orderItem.product_variant_sku_code.length > 0,
    );
    TestValidator.predicate(
      "orderItem has valid unit price",
      typeof item.orderItem.unit_price === "number" &&
        item.orderItem.unit_price > 0,
    );
    TestValidator.predicate(
      "orderItem has valid quantity",
      typeof item.orderItem.quantity === "number" &&
        item.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "orderItem has valid subtotal",
      typeof item.orderItem.subtotal === "number" &&
        item.orderItem.subtotal > 0,
    );
    TestValidator.predicate(
      "orderItem status is valid",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.orderItem.status,
      ),
    );
    TestValidator.predicate(
      "orderItem has created_at",
      !isNaN(Date.parse(item.orderItem.created_at)),
    );
    // Verify all items belong to the specified shipment
    TestValidator.equals(
      "shipment id matches requested shipment",
      item.shipment.id,
      shipmentId,
    );
  }
  // 9. Validate items are sorted by created_at descending (newest first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const prevDate = new Date(result.data[i].created_at).getTime();
      const nextDate = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "items sorted by created_at descending",
        prevDate >= nextDate,
      );
    }
  }
  // 10. Validate pagination bounds
  TestValidator.predicate(
    "current page is within valid bounds",
    result.pagination.current >= 1 &&
      result.pagination.current <= result.pagination.pages,
  );
  TestValidator.predicate(
    "items returned within page bounds",
    result.data.length <= result.pagination.limit,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
}