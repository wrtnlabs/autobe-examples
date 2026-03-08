import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { generate_random_ecommerce_mall_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_index_super_admin_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://admin.example.com/join",
      referrer: "http://admin.example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://customer.example.com/join",
      referrer: "http://customer.example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Customer submits admin request
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  const customerRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerLoginConnection,
      {
        body: {
          reason: "I need administrative access to manage customer support",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(customerRequest);
  // 4. Create seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://seller.example.com/join",
      referrer: "http://seller.example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 5. Seller submits admin request
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const sellerRequest =
    await api.functional.ecommerceMall.seller.admin_requests.create(
      sellerLoginConnection,
      {
        body: {
          reason: "I need administrative access to manage product catalogs",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(sellerRequest);
  // 6. Authenticate as super administrator (fresh session)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuthenticated = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminAuthenticated);
  // 7. Retrieve all admin requests with empty filters
  const allRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "total records includes both requests",
    allRequests.pagination.records,
    2,
  );
  TestValidator.equals("current page is 1", allRequests.pagination.current, 1);
  TestValidator.equals("limit is default 20", allRequests.pagination.limit, 20);
  TestValidator.equals(
    "pages calculated correctly",
    allRequests.pagination.pages,
    1,
  );
  // 9. Validate response data contains both requests
  TestValidator.equals("data count matches total", allRequests.data.length, 2);
  // 10. Test filtering by status (pending)
  const pendingRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          request_status: "pending",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  TestValidator.equals(
    "pending filter returns correct count",
    pendingRequests.pagination.records,
    2,
  );
  // 11. Test filtering by requester type (customer)
  const customerRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          requester_type: "customer",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(customerRequests);
  TestValidator.equals(
    "customer filter returns correct count",
    customerRequests.pagination.records,
    1,
  );
  // 12. Test filtering by requester type (seller)
  const sellerRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          requester_type: "seller",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sellerRequests);
  TestValidator.equals(
    "seller filter returns correct count",
    sellerRequests.pagination.records,
    1,
  );
  // 13. Test sorting by created_at ascending
  const sortedRequestsAsc =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sortedRequestsAsc);
  TestValidator.equals(
    "sorted ascending count",
    sortedRequestsAsc.pagination.records,
    2,
  );
  // 14. Test sorting by created_at descending
  const sortedRequestsDesc =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminLoginConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sortedRequestsDesc);
  TestValidator.equals(
    "sorted descending count",
    sortedRequestsDesc.pagination.records,
    2,
  );
}
