import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_audit_active(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // Authenticate customer to establish active session using utility function
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // Prepare request body for active sessions audit
  const request: IShoppingMallCustomerSession.IRequest = {
    actor_type: "customer",
    status: "active",
    page: 1,
    limit: 10,
  };
  // Fetch paginated active sessions
  const response = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals("pagination structure", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    response.pagination.pages >= 1,
  );
  // Validate each session record
  for (const session of response.data) {
    // Session email must match authenticated customer
    TestValidator.equals(
      "session email matches authenticated customer",
      session.email,
      customerEmail,
    );
  }
  // Confirm at least one session is returned
  TestValidator.predicate(
    "at least one session returned",
    response.data.length >= 1,
  );
  // Confirm session records are ordered by created_at in descending order (newest first)
  // Create expected sorted array from response.data by created_at DESC
  const expectedSorted = [...response.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.index(
    "sessions ordered by created_at DESC",
    expectedSorted,
    response.data,
  );
}
