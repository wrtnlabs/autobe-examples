import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_reviews_dashboard_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the system
  const testPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create customer-specific connection with token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResult.token.access },
  };
  // 3. Call dashboard endpoint to retrieve reviews (empty for now)
  const dashboardResponse =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(dashboardResponse);
  // 4. Validate pagination metadata exists
  TestValidator.equals("pagination metadata", dashboardResponse.pagination, {
    current: 1,
    limit: 100,
    records: 0,
    pages: 0,
  });
  // 5. Validate data array exists
  TestValidator.equals("data array exists", dashboardResponse.data, []);
  // 6. Test session persistence - Customer logs out (connection without token)
  const logoutConnection: api.IConnection = { host: connection.host };
  // 7. Customer logs back in with same credentials
  const rejoinConnection: api.IConnection = { host: connection.host };
  const rejoinResult = await authorize_customer_login(rejoinConnection, {
    body: {
      email: joinResult.email,
      password: testPassword,
    },
  });
  typia.assert(rejoinResult);
  // 8. Create new connection with refreshed token
  const reauthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: rejoinResult.token.access },
  };
  // 9. Call dashboard again to verify session persistence
  const dashboardAfterReauth =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      reauthConnection,
      {
        body: {},
      },
    );
  typia.assert(dashboardAfterReauth);
  // 10. Validate dashboard still accessible after re-authentication
  TestValidator.equals(
    "dashboard accessible after re-auth",
    dashboardAfterReauth.data,
    dashboardResponse.data,
  );
}