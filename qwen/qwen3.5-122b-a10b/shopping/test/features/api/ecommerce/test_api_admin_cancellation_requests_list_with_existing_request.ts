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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Test administrator cancellation request listing with existing pending request.
 *
 * Validates that administrators can retrieve cancellation request information for order oversight purposes. The test creates a complete workflow from account registration through cancellation request creation, then verifies the admin can view the request details.
 *
 * The test ensures the response contains the correct cancellation request with status 'pending', the customer-provided reason, and proper pagination metadata including current page, limit, records count, and total pages.
 *
 * Note: This test assumes the existence of a valid order and order item. In a complete E2E test suite, these would be created through separate order creation tests.
 *
 * 1. Administrator registers with credentials and reason for approval.
 * 2. Administrator authenticates to obtain access token.
 * 3. Customer registers with email and credentials.
 * 4. Customer authenticates to place orders.
 * 5. Generate valid order and order item IDs (assumed to exist from prior setup).
 * 6. Customer creates a cancellation request for the order item with a reason.
 * 7. Administrator lists cancellation requests for the order item.
 * 8. Validates the cancellation request has status 'pending' and matches the provided reason.
 * 9. Validates pagination metadata is present and correctly structured.
 */
export async function test_api_admin_cancellation_requests_list_with_existing_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Generate valid order and order item IDs
  // In a complete test suite, these would come from actual order creation
  // For this test, we generate valid UUIDs that would correspond to existing records
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer creates a cancellation request for the order item
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: cancellationReason,
        } satisfies IEcommerceCancellationRequest.ICreate,
        params: {
          orderId: orderId,
          itemId: itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Administrator lists cancellation requests for the order item
  const cancellationRequests =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.index(
      adminConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: {},
      },
    );
  typia.assert(cancellationRequests);
  // 6. Validate the response contains the cancellation request
  TestValidator.equals(
    "has at least one cancellation request",
    cancellationRequests.data.length > 0,
    true,
  );
  if (cancellationRequests.data.length > 0) {
    const request = cancellationRequests.data[0];
    typia.assert(request);
    TestValidator.equals(
      "cancellation request status is pending",
      request.status,
      "pending",
    );
    TestValidator.equals(
      "cancellation request reason matches",
      request.reason,
      cancellationReason,
    );
    TestValidator.equals(
      "cancellation request has valid ID",
      request.id.length > 0,
      true,
    );
    TestValidator.equals(
      "cancellation request has created_at",
      request.created_at.length > 0,
      true,
    );
    TestValidator.equals(
      "cancellation request has updated_at",
      request.updated_at.length > 0,
      true,
    );
  }
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination has current page",
    cancellationRequests.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    cancellationRequests.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    cancellationRequests.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    cancellationRequests.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "records count matches data length",
    cancellationRequests.pagination.records,
    cancellationRequests.data.length,
  );
}
