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
 * Test administrator retrieval of rejected cancellation request status.
 *
 * Validates that administrators can access cancellation requests with rejected status and view the seller's rejection reason. This test ensures the admin oversight capability for understanding why customer cancellation requests were denied by sellers.
 *
 * The test authenticates as an administrator, retrieves a cancellation request, and verifies the response contains the expected rejected status and seller response fields.
 *
 * 1. Administrator joins and authenticates with the system.
 * 2. Retrieves a cancellation request via admin endpoint with order item context.
 * 3. Validates response structure:
 *    3.1. Status field equals 'rejected'
 *    3.2. Seller response contains rejection reason (non-null)
 *    3.3. Order item embedded with product variant and seller details
 * 4. Confirms typia.assert validates complete response type safety.
 */
export async function test_api_admin_cancellation_request_rejected_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
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
  // 2. Retrieve cancellation request (using random UUIDs for test data)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
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
  // 3. Validate business logic: rejected status and seller response
  TestValidator.equals(
    "cancellation status is rejected",
    cancellationRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "seller response contains rejection reason",
    cancellationRequest.sellerResponse !== null &&
      cancellationRequest.sellerResponse.length > 0,
  );
  // 4. Validate embedded order item exists with required fields
  TestValidator.predicate(
    "order item exists",
    cancellationRequest.orderItem !== undefined &&
      cancellationRequest.orderItem !== null,
  );
  TestValidator.predicate(
    "order item has valid quantity",
    cancellationRequest.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item has positive unit price",
    cancellationRequest.orderItem.unit_price > 0,
  );
  // 5. Validate embedded product variant exists
  TestValidator.predicate(
    "product variant exists",
    cancellationRequest.orderItem.productVariant !== undefined &&
      cancellationRequest.orderItem.productVariant !== null,
  );
  TestValidator.predicate(
    "product variant has SKU code",
    cancellationRequest.orderItem.productVariant.sku_code.length > 0,
  );
  // 6. Validate embedded seller exists
  TestValidator.predicate(
    "seller exists",
    cancellationRequest.orderItem.seller !== undefined &&
      cancellationRequest.orderItem.seller !== null,
  );
  TestValidator.predicate(
    "seller has shop name",
    cancellationRequest.orderItem.seller.shop_name.length > 0,
  );
}
