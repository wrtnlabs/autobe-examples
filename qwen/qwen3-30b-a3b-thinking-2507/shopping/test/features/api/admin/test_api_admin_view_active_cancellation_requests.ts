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

export async function test_api_admin_view_active_cancellation_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Get test order ID (mocked for simplicity)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. View cancellation requests
  const response: IPageIEcommerceCancellationRequest.ISummary =
    await api.functional.ecommerce.admin.orders.cancellation_requests.index(
      adminConnection,
      {
        orderId: orderId,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response
  TestValidator.equals("page number matches", response.pagination.current, 1);
  TestValidator.equals("limit matches", response.pagination.limit, 10);
  TestValidator.predicate(
    "should have cancellation requests",
    response.data.length > 0,
  );
  // Verify critical fields of first cancellation request
  const firstRequest = response.data[0];
  TestValidator.equals(
    "request status should be pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "should have customer information",
    !!firstRequest.customer,
  );
  TestValidator.predicate(
    "should have order information",
    !!firstRequest.order,
  );
}
