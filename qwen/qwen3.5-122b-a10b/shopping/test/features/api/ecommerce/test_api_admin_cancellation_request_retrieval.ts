import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
 * Administrator retrieves a pending cancellation request for an order item.
 *
 * Validates the admin's ability to access cancellation request details including customer's reason, current status, and embedded order item summary with product variant and seller information. Ensures all timestamps and order item context are properly returned.
 *
 * The test follows the complete admin oversight workflow for cancellation request retrieval, verifying that administrators have full visibility into pending cancellation requests for order monitoring and approval workflows.
 *
 * 1. Administrator authenticates using admin join endpoint.
 * 2. Generates UUIDs for order, order item, and cancellation request (simulating existing resources).
 * 3. Calls cancellation request retrieval endpoint with admin connection.
 * 4. Validates response structure includes all required fields.
 * 5. Verifies order item summary contains product variant and seller details.
 * 6. Confirms timestamps are properly formatted as ISO 8601 date-time strings.
 */
export async function test_api_admin_cancellation_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate UUIDs for existing resources (simulated)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve cancellation request as admin
  const cancellationRequest: IEcommerceCancellationRequest =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.at(
      adminConnection,
      {
        orderId,
        itemId,
        requestId,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Validate cancellation request business logic
  TestValidator.equals(
    "cancellation request ID matches",
    cancellationRequest.id,
    requestId,
  );
  TestValidator.predicate(
    "reason is non-empty",
    cancellationRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "status is valid enum",
    ["pending", "approved", "rejected"].includes(cancellationRequest.status),
  );
  // 5. Validate order item summary structure
  const orderItem = cancellationRequest.orderItem;
  TestValidator.predicate("order item has quantity", orderItem.quantity >= 1);
  TestValidator.predicate(
    "order item has unit price",
    orderItem.unit_price >= 0,
  );
  // 6. Validate order reference exists
  TestValidator.predicate("order has ID", orderItem.order.id.length > 0);
  TestValidator.predicate(
    "order has order number",
    orderItem.order.order_number.length > 0,
  );
  // 7. Validate product variant reference exists
  TestValidator.predicate(
    "variant has SKU code",
    orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    orderItem.productVariant.option_values.length > 0,
  );
  // 8. Validate seller reference exists
  TestValidator.predicate(
    "seller has shop name",
    orderItem.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller has approval status",
    orderItem.seller.approval_status.length > 0,
  );
}
