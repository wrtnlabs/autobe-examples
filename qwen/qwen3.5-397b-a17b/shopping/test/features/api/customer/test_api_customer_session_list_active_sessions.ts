import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer session history retrieval.
 * 1. Customer registers account
 * 2. Customer logs in to create session record
 * 3. Customer retrieves session history
 * 4. Validate pagination metadata and session data structure
 */
export async function test_api_customer_session_list_active_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Store password for reuse in login
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Customer registration - creates initial session
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Customer login - creates new session record
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(loginConnection, {
    body: {
      email: customer.email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Retrieve session history using the logged-in connection
  const sessionsResponse =
    await api.functional.shoppingMall.customer.sessions.index(loginConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at,desc",
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(sessionsResponse);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    sessionsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    sessionsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    sessionsResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "has at least 1 record",
    sessionsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    sessionsResponse.pagination.pages >= 1,
  );
  // 5. Validate session data exists
  TestValidator.predicate(
    "has session data",
    sessionsResponse.data.length >= 1,
  );
  const firstSession = sessionsResponse.data[0];
  // 6. Validate isActive is correctly computed (should be true for recent session)
  TestValidator.predicate(
    "recent session is active",
    firstSession.isActive === true,
  );
  // 7. Validate sessions are sorted by created_at descending
  if (sessionsResponse.data.length > 1) {
    const firstCreatedAt = new Date(firstSession.created_at).getTime();
    const secondCreatedAt = new Date(
      sessionsResponse.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "sorted descending",
      firstCreatedAt >= secondCreatedAt,
    );
  }
}
