import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_filter_cancellation_requests_by_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Define a test order ID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the API to filter cancellation requests for the order with 'pending' status
  const response =
    await api.functional.ecommerce.admin.orders.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
        orderId,
      },
    );
  typia.assert(response);
  // 4. Verify there is at least one cancellation request
  TestValidator.predicate(
    "should contain at least one cancellation request",
    response.data.length > 0,
  );
  // 5. Verify all returned requests have status 'pending'
  for (const request of response.data) {
    TestValidator.equals(
      "all requests should have status 'pending'",
      request.status,
      "pending",
    );
  }
  // 6. Verify pagination metadata (at least 1 page)
  TestValidator.equals(
    "pagination should have correct page number",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should have correct limit",
    response.pagination.limit,
    10,
  );
}
