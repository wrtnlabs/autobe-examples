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
import { generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_customer_cancellation_request_update_status_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // Test seller approval status update by the customer for an existing cancellation request.
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new cancellation request for that customer
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create_cancellation_request(
      customerConnection,
      { body: {} },
    );
  typia.assert(cancellationRequest);
  // 3. Allowed enum values for seller approval status
  const allowedStatuses = ["pending", "approved", "rejected"] as const;
  for (const status of allowedStatuses) {
    const updateBody = {
      seller_approval_status: status,
      seller_approval_reason:
        status === "pending" ? null : `Status changed to ${status}`,
      processed_at: status === "pending" ? null : new Date().toISOString(),
    };
    // Update the cancellation request with new status
    const updated =
      await api.functional.shoppingMall.customer.cancellation_requests.updateCancellationRequest(
        customerConnection,
        {
          cancellationRequestId: (
            cancellationRequest as unknown as {
              id: string;
            }
          ).id,
          body: updateBody,
        },
      );
    typia.assert(updated);
    // Access properties via permissive cast for validation
    const upd = updated as unknown as {
      seller_approval_status: string | null;
      seller_approval_reason: string | null;
      processed_at: string | null;
    };
    TestValidator.equals(
      "seller_approval_status",
      upd.seller_approval_status,
      status,
    );
    if (status === "pending") {
      TestValidator.equals(
        "seller_approval_reason",
        upd.seller_approval_reason,
        null,
      );
      TestValidator.equals("processed_at", upd.processed_at, null);
    } else {
      TestValidator.predicate(
        "seller_approval_reason is non-null",
        upd.seller_approval_reason !== null &&
          upd.seller_approval_reason.length > 0,
      );
      TestValidator.predicate(
        "processed_at is valid ISO string",
        typeof upd.processed_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
            upd.processed_at ?? "",
          ),
      );
    }
  }
}
