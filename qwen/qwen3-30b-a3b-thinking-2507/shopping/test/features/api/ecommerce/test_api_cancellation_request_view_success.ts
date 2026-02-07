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

export async function test_api_cancellation_request_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // 2. Login as admin
  const loggedInConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loggedInConnection, {
    body: {
      email: admin.email,
      password: "password123",
    },
  });
  // 3. Verify the admin can view a cancellation request
  const id = typia.random<string & tags.Format<"uuid">>();
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await api.functional.ecommerce.admin.orders.cancellation_requests.at(
      loggedInConnection,
      {
        orderId,
        id,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Validate the response
  const allowedStatuses = ["pending", "approved", "rejected", "canceled"];
  const isValidStatus = allowedStatuses.includes(cancellationRequest.status);
  TestValidator.predicate("status is valid", isValidStatus);
  if (
    cancellationRequest.reason !== null &&
    cancellationRequest.reason !== undefined
  ) {
    TestValidator.equals(
      "reason is a string",
      typeof cancellationRequest.reason,
      "string",
    );
  }
  TestValidator.equals(
    "order is an object",
    typeof cancellationRequest.order,
    "object",
  );
  TestValidator.equals(
    "customer is an object",
    typeof cancellationRequest.customer,
    "object",
  );
}
