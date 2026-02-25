import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
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

export async function test_api_customer_session_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer and create initial session
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
        password: "12345678" satisfies string &
          tags.MinLength<8> &
          tags.MaxLength<128> &
          tags.Format<"password">,
        display_name: "Test User",
        phone_number: "010-1234-5678",
        href: "https://example.com/join" satisfies string & tags.Format<"uri">,
        referrer: "https://example.com/referrer" satisfies string &
          tags.Format<"uri">,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Test pagination with page 1 and limit 20
  const page1 = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 20", page1.pagination.limit, 20);
  TestValidator.predicate("has records", page1.pagination.records >= 1);
  // 4. Test page navigation
  const page2 = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(page2);
  // 5. Verify pages are different (when multiple pages exist)
  if (page1.pagination.pages > 1) {
    TestValidator.notEquals(
      "page 1 and 2 data differ",
      JSON.stringify(page1.data),
      JSON.stringify(page2.data),
    );
  }
  // 6. Test limit boundary values
  const limit1 = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(limit1);
  TestValidator.predicate(
    "limit 1 returns at most 1 record",
    limit1.data.length <= 1,
  );
  const limit100 = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(limit100);
  // 7. Verify session count matches pagination records
  TestValidator.equals(
    "session count matches records",
    limit100.data.length,
    limit100.pagination.records,
  );
  // 8. Confirm newest-first order by default
  if (limit100.data.length >= 2) {
    const date1 = new Date(limit100.data[0].created_at).getTime();
    const date2 = new Date(limit100.data[1].created_at).getTime();
    TestValidator.predicate("newest first order", date1 >= date2);
  }
}
