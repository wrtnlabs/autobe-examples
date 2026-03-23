import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
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

export async function test_api_admin_request_pending_list_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create regular customer to submit admin request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Simulate admin request submission (since submission endpoint not in API)
  // We'll create multiple test requests by calling the endpoint multiple times
  // This assumes the pending list endpoint will show requests from various sources
  // 4. Super admin retrieves pending requests
  const pendingRequests =
    await api.functional.ecommerceMall.admin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending" as const,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 5. Validate pending requests structure
  TestValidator.predicate(
    "has pending requests",
    pendingRequests.data.length > 0,
  );
  TestValidator.equals(
    "pagination correct",
    pendingRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    pendingRequests.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "has records",
    pendingRequests.pagination.records > 0,
  );
  // 6. Validate request details
  const request = pendingRequests.data[0];
  TestValidator.equals("request status is pending", request.status, "pending");
  TestValidator.equals(
    "request has user info",
    request.user.id,
    customer.customer.id,
  );
  TestValidator.equals(
    "request has email",
    request.user.email,
    customer.customer.email,
  );
  TestValidator.equals(
    "request has email (not name)",
    request.user.email,
    customer.customer.email,
  );
  TestValidator.equals(
    "request has responded_at as null",
    request.responded_at,
    null,
  );
  // 7. Test pagination with multiple requests
  const paginationRequests =
    await api.functional.ecommerceMall.admin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending" as const,
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(paginationRequests);
  TestValidator.equals(
    "pagination limit respects 5",
    paginationRequests.pagination.limit,
    5,
  );
}