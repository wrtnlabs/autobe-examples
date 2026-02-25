import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_request_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that deleting a cancellation request without authentication fails with proper error.
  // 1. Attempt to delete using base connection without authorization headers.
  // 2. Expect an HTTP 401 Unauthorized or 403 Forbidden error.
  // Generate a random UUID for a cancellation request id
  const fakeCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "delete cancellation request without authentication should be denied",
    [401, 403],
    async () => {
      // Direct call without any authentication
      await api.functional.shoppingMall.customer.cancellation_requests.erase(
        connection,
        {
          cancellationRequestId: fakeCancellationRequestId,
        },
      );
    },
  );
}
