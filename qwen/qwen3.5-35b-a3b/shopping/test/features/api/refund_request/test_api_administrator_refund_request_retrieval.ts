import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator's ability to retrieve a refund request by its unique UUID identifier.
 *
 * Validates the complete refund request view workflow for platform administrators, including authorization checks, data retrieval, and response structure validation. Ensures that administrators have full visibility into all refund requests across the platform regardless of customer or seller involvement.
 *
 * Special attention is given to verifying the order item summary, seller details for approvals/rejections, and proper timestamp formatting throughout the refund request lifecycle.
 *
 * 1. Administrator joins and authenticates with valid credentials.
 * 2. Administrator retrieves a refund request by its unique UUID.
 * 3. System validates UUID format and queries database for the refund request.
 * 4. System performs authorization check - administrator has access to all refund requests.
 * 5. System joins order_items table to include complete order item summary.
 * 6. System joins sellers table to include approved/rejected seller details when applicable.
 * 7. Validate complete refund request response structure and all nested fields.
 */
export async function test_api_administrator_refund_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Administrator retrieves refund request by UUID
  // Using typia.random to simulate a valid UUID for the test
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerceMall.administrator.refund_requests.at(
      adminConnection,
      {
        id: refundRequestId,
      },
    );
  typia.assert(refundRequest);
  // 3. Validate refund request basic fields
  TestValidator.equals("refund request ID", refundRequest.id, refundRequestId);
  TestValidator.equals(
    "order item ID exists",
    refundRequest.order_item_id !== undefined,
    true,
  );
  TestValidator.equals("reason length", refundRequest.reason.length, 0);
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.equals("soft deleted check", refundRequest.deleted_at, null);
  // 4. Validate order item summary fields
  TestValidator.equals(
    "order number exists",
    refundRequest.order_item.order_number !== "",
    true,
  );
  TestValidator.equals(
    "seller display name exists",
    refundRequest.order_item.seller_display_name !== "",
    true,
  );
  TestValidator.equals(
    "product variant name exists",
    refundRequest.order_item.product_variant_name !== "",
    true,
  );
  TestValidator.equals(
    "product variant SKU code exists",
    refundRequest.order_item.product_variant_sku_code !== "",
    true,
  );
  TestValidator.equals(
    "product variant price",
    refundRequest.order_item.product_variant_price > 0,
    true,
  );
  TestValidator.equals(
    "quantity minimum",
    refundRequest.order_item.quantity >= 1,
    true,
  );
  TestValidator.equals(
    "unit price",
    refundRequest.order_item.unit_price > 0,
    true,
  );
  TestValidator.equals(
    "subtotal",
    refundRequest.order_item.subtotal,
    refundRequest.order_item.quantity * refundRequest.order_item.unit_price,
  );
  TestValidator.equals(
    "order item status",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      refundRequest.order_item.status,
    ),
    true,
  );
  TestValidator.equals(
    "created_at format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refundRequest.order_item.created_at,
    ),
    true,
  );
  // 5. Validate seller details for approvals/rejections
  TestValidator.equals(
    "approvedBySeller is null or valid",
    refundRequest.approvedBySeller === null ||
      refundRequest.approvedBySeller.id !== undefined,
    true,
  );
  TestValidator.equals(
    "rejectedBySeller is null or valid",
    refundRequest.rejectedBySeller === null ||
      refundRequest.rejectedBySeller.id !== undefined,
    true,
  );
  // 6. Validate timestamps
  TestValidator.equals(
    "created_at format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refundRequest.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refundRequest.updated_at),
    true,
  );
}
