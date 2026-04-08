import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test viewing administrator promotion requests with different statuses and processed_by_administrator information.
 *
 * Validates the complete promotion request workflow including request submission, approval, rejection, and viewing processed requests with administrator attribution. Ensures that processed requests correctly show which super administrator handled them and includes rejection reasons when applicable.
 *
 * Special attention is given to verifying that the processed_by_administrator field is populated with the super administrator's summary information and that rejection_reason is correctly set for rejected requests.
 *
 * 1. Register and authenticate as super administrator
 * 2. Register and authenticate as first customer
 * 3. Submit first promotion request from customer
 * 4. Approve the first promotion request as super administrator
 * 5. View approved requests and verify processed_by_administrator is populated
 * 6. Register and authenticate as second customer
 * 7. Submit second promotion request
 * 8. Reject the second promotion request with rejection reason
 * 9. View rejected requests and verify rejection_reason and processed_by_administrator
 * 10. View all requests and verify mixed statuses appear correctly
 */
export async function test_api_administrator_promotion_request_view_processed_with_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "SuperAdmin123",
        href: "https://test.com/admin",
        referrer: "https://test.com/login",
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Register and authenticate as first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: {
      email: "customer1@test.com",
      password: "Customer123",
      href: "https://test.com/customer",
      referrer: "https://test.com/signup",
    },
  });
  typia.assert(customer1Auth);
  // 3. Submit first promotion request from customer
  const request1 =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customer1Connection,
      {
        body: {
          reason:
            "I want to help manage the platform and ensure quality standards",
        },
      },
    );
  typia.assert(request1);
  TestValidator.equals("request status is pending", request1.status, "pending");
  TestValidator.equals(
    "processed_by_administrator is null for pending",
    request1.processedByAdministrator,
    null,
  );
  // 4. Approve the first promotion request as super administrator
  const approvedRequest1 =
    await api.functional.shoppingMall.administrator.promotion_requests.update(
      superAdminConnection,
      {
        requestId: request1.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest1);
  TestValidator.equals(
    "approved request status",
    approvedRequest1.status,
    "approved",
  );
  TestValidator.predicate(
    "processed_by_administrator exists",
    approvedRequest1.processedByAdministrator !== null,
  );
  TestValidator.equals(
    "processed by super admin",
    approvedRequest1.processedByAdministrator!.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "rejected_reason is null for approved",
    approvedRequest1.rejected_reason,
    null,
  );
  // 5. View approved requests and verify processed_by_administrator is populated
  const approvedRequests =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  TestValidator.predicate(
    "has approved requests",
    approvedRequests.data.length > 0,
  );
  const approvedRequest = approvedRequests.data.find(
    (r) => r.id === request1.id,
  );
  TestValidator.predicate(
    "approved request found",
    approvedRequest !== undefined,
  );
  TestValidator.equals("approved status", approvedRequest!.status, "approved");
  TestValidator.predicate(
    "processed_by_administrator populated",
    approvedRequest!.processed_by_administrator !== null,
  );
  TestValidator.equals(
    "processed by correct admin",
    approvedRequest!.processed_by_administrator!.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "rejected_reason null",
    approvedRequest!.rejected_reason,
    null,
  );
  // 6. Register and authenticate as second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: {
      email: "customer2@test.com",
      password: "Customer123",
      href: "https://test.com/customer",
      referrer: "https://test.com/signup",
    },
  });
  typia.assert(customer2Auth);
  // 7. Submit second promotion request
  const request2 =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customer2Connection,
      {
        body: {
          reason: "I have experience in e-commerce management",
        },
      },
    );
  typia.assert(request2);
  TestValidator.equals(
    "request2 status is pending",
    request2.status,
    "pending",
  );
  // 8. Reject the second promotion request with rejection reason
  const rejectedRequest2 =
    await api.functional.shoppingMall.administrator.promotion_requests.update(
      superAdminConnection,
      {
        requestId: request2.id,
        body: {
          status: "rejected",
          rejected_reason: "We currently do not need additional administrators",
        } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest2);
  TestValidator.equals(
    "rejected request status",
    rejectedRequest2.status,
    "rejected",
  );
  TestValidator.predicate(
    "processed_by_administrator exists",
    rejectedRequest2.processedByAdministrator !== null,
  );
  TestValidator.equals(
    "processed by super admin",
    rejectedRequest2.processedByAdministrator!.id,
    superAdminAuth.id,
  );
  TestValidator.predicate(
    "rejected_reason exists",
    rejectedRequest2.rejected_reason !== null,
  );
  TestValidator.equals(
    "rejected_reason matches",
    rejectedRequest2.rejected_reason,
    "We currently do not need additional administrators",
  );
  // 9. View rejected requests and verify rejection_reason and processed_by_administrator
  const rejectedRequests =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  TestValidator.predicate(
    "has rejected requests",
    rejectedRequests.data.length > 0,
  );
  const rejectedRequest = rejectedRequests.data.find(
    (r) => r.id === request2.id,
  );
  TestValidator.predicate(
    "rejected request found",
    rejectedRequest !== undefined,
  );
  TestValidator.equals("rejected status", rejectedRequest!.status, "rejected");
  TestValidator.predicate(
    "processed_by_administrator populated",
    rejectedRequest!.processed_by_administrator !== null,
  );
  TestValidator.equals(
    "processed by correct admin",
    rejectedRequest!.processed_by_administrator!.id,
    superAdminAuth.id,
  );
  TestValidator.predicate(
    "rejected_reason populated",
    rejectedRequest!.rejected_reason !== null,
  );
  // 10. View all requests and verify mixed statuses appear correctly
  const allRequests =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  TestValidator.predicate("has requests", allRequests.data.length >= 2);
  const hasApproved = allRequests.data.some((r) => r.status === "approved");
  const hasRejected = allRequests.data.some((r) => r.status === "rejected");
  TestValidator.predicate("has approved requests", hasApproved);
  TestValidator.predicate("has rejected requests", hasRejected);
}
