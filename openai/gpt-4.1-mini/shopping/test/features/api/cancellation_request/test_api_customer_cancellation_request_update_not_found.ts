import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_request_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authorization join
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {}, // no specific fields required by schema IShoppingMallCustomer.IJoin
  });
  // Prepare invalid UUIDs for test
  const invalidUuid = "00000000-0000-0000-0000-000000000000"; // Non-existent but valid UUID
  const malformedUuid = "invalid-uuid-format"; // Malformed UUID
  // Prepare update body with empty or default values (as no fields defined in IUpdate, send empty object)
  const updateBody: IShoppingMallCancellationRequest.IUpdate = {};
  // 2. Try update with valid but non-existent UUID - Expect HTTP 404 error
  await TestValidator.httpError(
    "update non-existent cancellation request",
    404,
    async () => {
      await api.functional.shoppingMall.customer.cancellation_requests.updateCancellationRequest(
        customerConnection,
        {
          cancellationRequestId: invalidUuid,
          body: updateBody,
        },
      );
    },
  );
  // 3. Try update with malformed UUID - Expect HTTP 400 or 404 error
  //    Not explicitly specified but the system should handle invalid UUID gracefully
  //    We'll accept 400 or 404 as valid error status codes here
  let caughtStatus: number | null = null;
  try {
    await api.functional.shoppingMall.customer.cancellation_requests.updateCancellationRequest(
      customerConnection,
      {
        cancellationRequestId: malformedUuid,
        body: updateBody,
      },
    );
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      caughtStatus = exp.status;
    } else {
      throw exp;
    }
  }
  // Check caught status is either 400 or 404
  TestValidator.predicate(
    "update malformed cancellation request UUID fails with 400 or 404",
    caughtStatus === 400 || caughtStatus === 404,
  );
}
