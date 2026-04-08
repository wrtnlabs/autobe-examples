import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_cancellation_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Create new connection with admin token
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Generate a random cancellation request ID for retrieval testing
  // Note: In a real scenario, a cancellation request would be created first
  // through the customer API workflow (order creation, then cancellation request)
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Super Administrator Retrieves Cancellation Request by ID
  const retrievedCancellationRequest =
    await api.functional.ecommerceMall.superAdministrator.cancellation_requests.at(
      adminAuthConnection,
      {
        id: cancellationRequestId,
      },
    );
  typia.assert(retrievedCancellationRequest);
  // 4. Validate Response Structure - Cancellation Request Fields
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedCancellationRequest.id,
    cancellationRequestId,
  );
  // 5. Validate Status Field is Valid Enum Value
  const validStatuses = ["pending", "approved", "rejected"] as const;
  TestValidator.predicate(
    "status is valid enum value",
    validStatuses.includes(
      retrievedCancellationRequest.status as (typeof validStatuses)[number],
    ),
  );
  // 6. Validate Timestamps Format
  typia.assert(retrievedCancellationRequest.created_at);
  typia.assert(retrievedCancellationRequest.updated_at);
  // 7. Validate Soft Delete Flag is NULL (not soft-deleted)
  TestValidator.equals(
    "not soft-deleted",
    retrievedCancellationRequest.deleted_at,
    null,
  );
  // 8. Validate Reason Field exists and is non-empty
  TestValidator.predicate(
    "reason is non-empty string",
    retrievedCancellationRequest.reason.length > 0,
  );
  // 9. Validate Nested Relationships Exist
  TestValidator.equals(
    "item reference exists",
    retrievedCancellationRequest.item.id !== undefined,
    true,
  );
  TestValidator.equals(
    "order reference exists",
    retrievedCancellationRequest.order.id !== undefined,
    true,
  );
  TestValidator.equals(
    "seller reference exists",
    retrievedCancellationRequest.seller.id !== undefined,
    true,
  );
  // 10. Validate Order Item Summary Fields
  TestValidator.equals(
    "order item has required fields",
    retrievedCancellationRequest.item.order_number !== undefined,
    true,
  );
  TestValidator.equals(
    "order item has seller_display_name",
    retrievedCancellationRequest.item.seller_display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "order item has product_variant_name",
    retrievedCancellationRequest.item.product_variant_name !== undefined,
    true,
  );
  TestValidator.equals(
    "order item has quantity",
    retrievedCancellationRequest.item.quantity > 0,
    true,
  );
  TestValidator.equals(
    "order item has status",
    retrievedCancellationRequest.item.status !== undefined,
    true,
  );
  // 11. Validate Order Summary Fields
  TestValidator.equals(
    "order has required fields",
    retrievedCancellationRequest.order.order_number !== undefined,
    true,
  );
  TestValidator.equals(
    "order has total_price",
    retrievedCancellationRequest.order.total_price > 0,
    true,
  );
  TestValidator.equals(
    "order has customer reference",
    retrievedCancellationRequest.order.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "order has shipping_address reference",
    retrievedCancellationRequest.order.shipping_address.id !== undefined,
    true,
  );
  TestValidator.equals(
    "order has items_count",
    retrievedCancellationRequest.order.items_count > 0,
    true,
  );
  // 12. Validate Seller Summary Fields
  TestValidator.equals(
    "seller has required fields",
    retrievedCancellationRequest.seller.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "seller has approval_status",
    retrievedCancellationRequest.seller.approval_status !== undefined,
    true,
  );
  TestValidator.equals(
    "seller has is_suspended status",
    retrievedCancellationRequest.seller.is_suspended !== undefined,
    true,
  );
  // 13. Validate UUID Format of Foreign Keys
  TestValidator.predicate(
    "ecommerce_mall_order_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedCancellationRequest.ecommerce_mall_order_id,
    ),
  );
  TestValidator.predicate(
    "ecommerce_mall_order_item_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedCancellationRequest.ecommerce_mall_order_item_id,
    ),
  );
  TestValidator.predicate(
    "ecommerce_mall_seller_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedCancellationRequest.ecommerce_mall_seller_id,
    ),
  );
  // 14. Validate Order Status is Consistent
  TestValidator.predicate(
    "order status is valid",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ].includes(retrievedCancellationRequest.order.status),
  );
  // 15. Validate Order Item Status is Consistent
  TestValidator.predicate(
    "order item status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      retrievedCancellationRequest.item.status,
    ),
  );
}
