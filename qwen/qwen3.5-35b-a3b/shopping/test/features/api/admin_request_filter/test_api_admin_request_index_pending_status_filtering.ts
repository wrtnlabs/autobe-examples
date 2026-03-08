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

export async function test_api_admin_request_index_pending_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminTest123!",
      href: "http://admin.test/join",
      referrer: "http://admin.test/signup",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create and login first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customerTest123!",
      href: "http://customer.test/join",
      referrer: "http://customer.test/signup",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer1);
  // 3. Create and login second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customerTest123!",
      href: "http://customer.test/join",
      referrer: "http://customer.test/signup",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // 4. Create and login first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerTest123!",
      href: "http://seller.test/join",
      referrer: "http://seller.test/signup",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1);
  // 5. Create and login second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerTest123!",
      href: "http://seller.test/join",
      referrer: "http://seller.test/signup",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2);
  // 6. Fetch pending requests with filter
  const pendingRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          request_status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    pendingRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    pendingRequests.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is positive",
    pendingRequests.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages matches",
    pendingRequests.pagination.pages,
    pendingRequests.data.length > 0 ? 1 : 0,
  );
  // 8. Validate response data structure
  for (const request of pendingRequests.data) {
    typia.assert(request);
    TestValidator.equals(
      "request status is pending",
      request.request_status,
      "pending",
    );
    TestValidator.predicate("request has id", request.id.length > 0);
    TestValidator.predicate("request has reason", request.reason.length > 0);
    TestValidator.predicate(
      "request has created_at",
      request.created_at.length > 0,
    );
    TestValidator.predicate(
      "request has updated_at",
      request.updated_at.length > 0,
    );
  }
  // 9. Test pagination - page 2 (should return different or empty results)
  const page2Requests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          request_status: "pending",
          page: 2,
          limit: 20,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(page2Requests);
  // 10. Verify sorting - newest first (created_at DESC)
  if (pendingRequests.data.length >= 2) {
    TestValidator.predicate(
      "data is sorted by created_at DESC",
      pendingRequests.data[0].created_at >= pendingRequests.data[1].created_at,
    );
  }
}
