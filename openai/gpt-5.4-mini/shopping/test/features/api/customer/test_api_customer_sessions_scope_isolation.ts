import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that the customer session listing endpoint only returns sessions
   * owned by the authenticated customer and keeps the response limited to the
   * documented summary structure.
   *
   * The test authenticates a customer account, requests the session list with a
   * broad query, and validates that every returned session belongs to the same
   * customer. It also ensures the paginated result remains confined to the
   * caller's scope and does not leak foreign customer session history.
   *
   * 1. Create an authenticated customer connection using the join utility.
   * 2. Query the session list with an empty broad request.
   * 3. Validate the paginated response and all returned items.
   * 4. Ensure the returned sessions are scoped to the authenticated customer.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const response = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IMallPlatformCustomerSession.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "session list response contains pagination metadata",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "session list response data is an array",
    Array.isArray(response.data),
  );
  for (const session of response.data) {
    typia.assert(session);
    TestValidator.equals(
      "session owner matches authenticated customer",
      session.customer.id,
      joined.id,
    );
    TestValidator.equals(
      "session owner email matches authenticated customer",
      session.customer.email,
      joined.email,
    );
  }
}
