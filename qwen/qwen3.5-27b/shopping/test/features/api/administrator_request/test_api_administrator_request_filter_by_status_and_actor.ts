import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator request filtering by status and actor type for super administrators.
 *
 * Validates that the administrator request filtering mechanism correctly returns requests matching specified status and actor type criteria. The test verifies that pagination metadata is accurate and that filtered results conform to the requested filter parameters.
 *
 * This test ensures that super administrators can effectively filter administrator promotion requests by their processing status (pending, approved, rejected) and by the type of actor who submitted the request (customer or seller).
 *
 * 1. Register and authenticate as a customer (acting as super administrator).
 * 2. Call PATCH /shoppingMall/customer/administrator-requests with filter { status: 'pending', actor_type: 'customer' }.
 * 3. Validate response structure and pagination metadata.
 * 4. Verify all returned requests match the filter criteria (status='pending', actor_type='customer').
 * 5. Test additional filter combinations to ensure filtering works correctly.
 * 6. Validate that null fields are handled correctly for pending requests.
 */
export async function test_api_administrator_request_filter_by_status_and_actor(
  connection: api.IConnection,
) {
  // 1. Authenticate as customer (super administrator)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test filtering by status='pending' and actor_type='customer'
  const pendingCustomerRequests =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          actor_type: "customer",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingCustomerRequests);
  // 3. Validate response structure
  TestValidator.predicate(
    "response has pagination metadata",
    pendingCustomerRequests.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(pendingCustomerRequests.data),
  );
  // 4. Verify all returned requests match filter criteria
  await ArrayUtil.asyncForEach(pendingCustomerRequests.data, async (request) => {
    TestValidator.equals(
      "request status matches filter",
      request.status,
      "pending",
    );
    TestValidator.equals(
      "request actor_type matches filter",
      request.actor_type,
      "customer",
    );
    TestValidator.equals(
      "pending request has null rejection_reason",
      request.rejection_reason,
      null,
    );
    TestValidator.equals(
      "pending request has null processedByAdministrator",
      request.processedByAdministrator,
      null,
    );
  });
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination records matches data length",
    pendingCustomerRequests.pagination.records,
    pendingCustomerRequests.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    pendingCustomerRequests.pagination.current === 1,
  );
  // 6. Test filtering by status='approved' and actor_type='seller'
  const approvedSellerRequests =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
          actor_type: "seller",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(approvedSellerRequests);
  // 7. Verify approved seller requests match filter criteria
  await ArrayUtil.asyncForEach(approvedSellerRequests.data, async (request) => {
    TestValidator.equals(
      "request status matches filter",
      request.status,
      "approved",
    );
    TestValidator.equals(
      "request actor_type matches filter",
      request.actor_type,
      "seller",
    );
  });
  // 8. Test filtering by status='rejected' only (no actor_type filter)
  const rejectedRequests =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // 9. Verify rejected requests have rejection_reason populated
  await ArrayUtil.asyncForEach(rejectedRequests.data, async (request) => {
    TestValidator.equals(
      "request status matches filter",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "rejected request has non-null rejection_reason",
      request.rejection_reason !== null,
    );
    TestValidator.predicate(
      "rejected request has non-null processedByAdministrator",
      request.processedByAdministrator !== null,
    );
  });
  // 10. Test filtering by actor_type='customer' only (no status filter)
  const customerRequests =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      customerConnection,
      {
        body: {
          actor_type: "customer",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(customerRequests);
  // 11. Verify all customer requests have correct actor_type
  await ArrayUtil.asyncForEach(customerRequests.data, async (request) => {
    TestValidator.equals(
      "request actor_type matches filter",
      request.actor_type,
      "customer",
    );
  });
  // 12. Test pagination with empty result set
  const emptyRequests =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          actor_type: "customer",
          page: 9999,
          pageSize: 1,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(emptyRequests);
  // 13. Validate empty pagination
  TestValidator.equals(
    "empty result has zero data length",
    emptyRequests.data.length,
    0,
  );
  TestValidator.predicate(
    "empty pagination has valid current page",
    emptyRequests.pagination.current === 9999,
  );
}