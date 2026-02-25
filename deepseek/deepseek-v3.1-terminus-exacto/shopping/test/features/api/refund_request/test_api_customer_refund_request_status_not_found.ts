import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_status_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Test 1: Invalid UUID format should return appropriate error
  await TestValidator.httpError("invalid uuid format", 400, async () => {
    await api.functional.ecommerce.customer.refund_requests.statuses.at(
      customerConnection,
      {
        refundRequestId: "invalid-uuid-format" as string & tags.Format<"uuid">,
        statusId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 2: Valid UUID but non-existent refund request
  const nonExistentRefundRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  const validStatusId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent refund request",
    404,
    async () => {
      await api.functional.ecommerce.customer.refund_requests.statuses.at(
        customerConnection,
        {
          refundRequestId: nonExistentRefundRequestId,
          statusId: validStatusId,
        },
      );
    },
  );
  // Test 3: Valid UUIDs but status ID doesn't belong to refund request
  const anotherRefundRequestId = typia.random<string & tags.Format<"uuid">>();
  const anotherStatusId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("status id mismatch", 404, async () => {
    await api.functional.ecommerce.customer.refund_requests.statuses.at(
      customerConnection,
      {
        refundRequestId: anotherRefundRequestId,
        statusId: anotherStatusId,
      },
    );
  });
}
