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
 * Test administrator cancellation requests listing with status filtering.
 *
 * Validates that administrators can filter cancellation requests by status to review specific stages of the cancellation workflow. The test ensures the status filter parameter correctly returns only matching cancellation requests.
 *
 * This test covers administrative oversight capabilities where admins need to review pending, approved, or rejected cancellation requests separately. It verifies the filtering logic works correctly for each status value.
 *
 * 1. Administrator registers and authenticates with the system.
 * 2. Customer registers and authenticates to place orders and submit cancellation requests.
 * 3. Customer submits a cancellation request for an order item using random UUIDs.
 * 4. Administrator lists cancellation requests filtered by 'pending' status.
 * 5. Validates that filtering returns only matching status requests.
 * 6. Tests filtering by 'approved' and 'rejected' statuses to ensure correct filtering behavior.
 * 7. Verifies that filters correctly exclude non-matching status requests.
 */
export async function test_api_admin_cancellation_requests_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
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
  // 2. Register and authenticate customer
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
  // 3. Create a cancellation request for an order item
  // Use random UUIDs for orderId and itemId (simulation mode will handle validation)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.create(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Administrator lists cancellation requests filtered by 'pending' status
  // The created request should have 'pending' status by default
  const pendingRequests =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 5. Validate that filtering by 'pending' returns only pending requests
  // All returned requests should have status 'pending'
  for (const request of pendingRequests.data) {
    TestValidator.equals(
      "pending filter returns only pending requests",
      request.status,
      "pending",
    );
  }
  // 6. Test filtering by 'approved' status
  // Since our created request is 'pending', this should return empty or no matching requests
  const approvedRequests =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // When filtering by 'approved', all returned requests should have status 'approved'
  // (may be empty if no approved requests exist for this order item)
  for (const request of approvedRequests.data) {
    TestValidator.equals(
      "approved filter returns only approved requests",
      request.status,
      "approved",
    );
  }
  // 7. Test filtering by 'rejected' status
  // Similar to approved, should return only rejected requests
  const rejectedRequests =
    await api.functional.ecommerce.admin.orders.items.cancellation_requests.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // When filtering by 'rejected', all returned requests should have status 'rejected'
  for (const request of rejectedRequests.data) {
    TestValidator.equals(
      "rejected filter returns only rejected requests",
      request.status,
      "rejected",
    );
  }
  // 8. Test that the created pending request appears in pending filter but not in others
  // Verify the pending request count is at least 1 (the one we created)
  TestValidator.predicate(
    "pending filter includes the created request",
    pendingRequests.data.length >= 1,
  );
  // Verify approved and rejected filters don't include the pending request
  TestValidator.equals(
    "approved filter excludes pending requests",
    approvedRequests.data.length,
    0,
  );
  TestValidator.equals(
    "rejected filter excludes pending requests",
    rejectedRequests.data.length,
    0,
  );
}
