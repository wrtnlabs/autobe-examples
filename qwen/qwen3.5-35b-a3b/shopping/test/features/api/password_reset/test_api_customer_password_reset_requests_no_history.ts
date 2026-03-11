import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_requests_no_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create fresh customer account with no password reset history
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  // 2. Call password reset requests endpoint with empty history
  const passwordResetRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actorType: "customer",
          requestStatus: "pending",
          sort: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResetRequests);
  // 3. Validate response structure and pagination metadata
  TestValidator.equals("data is empty array", passwordResetRequests.data, []);
  TestValidator.equals(
    "current page is 1",
    passwordResetRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 10",
    passwordResetRequests.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records is 0",
    passwordResetRequests.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages is 0",
    passwordResetRequests.pagination.pages,
    0,
  );
  // 4. Test filter parameters are accepted with no effect when no data
  const filteredRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
          actorType: "seller",
          email: "test@example.com",
          createdAtFrom: new Date().toISOString(),
          createdAtTo: new Date().toISOString(),
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(filteredRequests);
  TestValidator.equals(
    "filtered data is empty array",
    filteredRequests.data,
    [],
  );
  TestValidator.equals(
    "filtered total records is 0",
    filteredRequests.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered total pages is 0",
    filteredRequests.pagination.pages,
    0,
  );
}
