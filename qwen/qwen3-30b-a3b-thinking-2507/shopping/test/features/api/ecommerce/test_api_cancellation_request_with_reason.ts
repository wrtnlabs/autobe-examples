import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Use random IDs for the existing test data
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const cancellationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve cancellation request
  const cancellationRequest =
    await api.functional.ecommerce.admin.orders.cancellation_requests.at(
      adminConnection,
      {
        orderId,
        id: cancellationId,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Verify reason exists and matches expected value
  const expectedReason = "Order was canceled due to payment issues";
  TestValidator.predicate(
    "Reason should not be null or undefined",
    cancellationRequest.reason != null,
  );
  TestValidator.equals(
    "Reason text appears correctly",
    cancellationRequest.reason,
    expectedReason,
  );
}
