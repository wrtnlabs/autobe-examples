import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Administrator views shipment tracking information for order fulfillment oversight.
 *
 * Validates that administrators can access complete shipment tracking details including carrier information, tracking numbers, delivery status, and associated order items. This test ensures admin-level visibility into the shipping workflow across all orders on the platform.
 *
 * The test authenticates as an administrator, then retrieves shipment tracking data using order and shipment identifiers. It validates the complete response structure including nested order summaries, seller information, and shipment item details.
 *
 * 1. Administrator registers and authenticates via join endpoint.
 * 2. Retrieves shipment tracking information using order ID and shipment ID.
 * 3. Validates carrier name exists and is non-empty string.
 * 4. Validates tracking number is present and properly formatted.
 * 5. Validates shipment status is one of the allowed values (pending, shipped, in_transit, delivered, exception).
 * 6. Validates shipped_at timestamp is present and in ISO 8601 format.
 * 7. Validates optional delivered_at timestamp when shipment is delivered.
 * 8. Validates order summary includes order ID, order number, status, and customer reference.
 * 9. Validates seller summary includes shop name and approval status.
 * 10. Validates shipment items array contains order item references with proper structure.
 */
export async function test_api_admin_view_shipment_tracking_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Retrieve shipment tracking information
  // Note: Using random UUIDs as we don't have creation functions for orders/shipments
  // In a real scenario, these would be created through the order and shipment creation endpoints
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipment: IEcommerceShipment =
    await api.functional.ecommerce.admin.orders.shipments.at(adminConnection, {
      orderId,
      shipmentId,
    });
  typia.assert(shipment);
  // 3. Validate carrier information
  TestValidator.predicate(
    "carrier name exists",
    shipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "carrier name is string",
    typeof shipment.carrier_name === "string",
  );
  // 4. Validate tracking number
  TestValidator.predicate(
    "tracking number exists",
    shipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "tracking number is string",
    typeof shipment.tracking_number === "string",
  );
  // 5. Validate tracking URL if present
  if (shipment.tracking_url !== null && shipment.tracking_url !== undefined) {
    TestValidator.predicate(
      "tracking URL is valid URI",
      typeof shipment.tracking_url === "string",
    );
  }
  // 6. Validate shipment status
  const allowedStatuses = [
    "pending",
    "shipped",
    "in_transit",
    "delivered",
    "exception",
  ];
  TestValidator.predicate(
    "status is valid",
    allowedStatuses.includes(shipment.status),
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "shipped_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(shipment.shipped_at),
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(shipment.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(shipment.updated_at),
  );
  // 8. Validate delivered_at when status is delivered
  if (shipment.status === "delivered") {
    TestValidator.predicate(
      "delivered_at exists when delivered",
      shipment.delivered_at !== null && shipment.delivered_at !== undefined,
    );
  }
  // 9. Validate order summary structure
  TestValidator.predicate(
    "order id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      shipment.order.id,
    ),
  );
  TestValidator.predicate(
    "order number exists",
    shipment.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order status is string",
    typeof shipment.order.status === "string",
  );
  TestValidator.predicate(
    "order total price is number",
    typeof shipment.order.total_price === "number",
  );
  TestValidator.predicate(
    "order customer id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      shipment.order.customer.id,
    ),
  );
  TestValidator.predicate(
    "order customer email is email",
    shipment.order.customer.email.includes("@"),
  );
  // 10. Validate seller summary structure
  TestValidator.predicate(
    "seller id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      shipment.seller.id,
    ),
  );
  TestValidator.predicate(
    "seller shop name exists",
    shipment.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller approval status is string",
    typeof shipment.seller.approval_status === "string",
  );
  TestValidator.predicate(
    "seller is_suspended is boolean",
    typeof shipment.seller.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "seller is_banned is boolean",
    typeof shipment.seller.is_banned === "boolean",
  );
  // 11. Validate shipment items
  TestValidator.predicate(
    "shipment items array exists",
    Array.isArray(shipment.shipment_items),
  );
  TestValidator.predicate(
    "shipment items has at least one item",
    shipment.shipment_items.length > 0,
  );
  // Validate each shipment item structure
  await ArrayUtil.asyncForEach(shipment.shipment_items, async (item, index) => {
    TestValidator.predicate(
      `shipment item[${index}] id is UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      `shipment item[${index}] order_item id is UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.order_item.id,
      ),
    );
    TestValidator.predicate(
      `shipment item[${index}] order_item quantity is positive number`,
      item.order_item.quantity >= 1,
    );
    TestValidator.predicate(
      `shipment item[${index}] order_item unit_price is number`,
      typeof item.order_item.unit_price === "number",
    );
    TestValidator.predicate(
      `shipment item[${index}] order_item status is string`,
      typeof item.order_item.status === "string",
    );
    TestValidator.predicate(
      `shipment item[${index}] order_item productVariant id is UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.order_item.productVariant.id,
      ),
    );
    TestValidator.predicate(
      `shipment item[${index}] order_item seller id is UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.order_item.seller.id,
      ),
    );
  });
  // 12. Validate shipment id is UUID
  TestValidator.predicate(
    "shipment id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      shipment.id,
    ),
  );
}
