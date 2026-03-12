import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that a customer can successfully retrieve details of their own refund request with pending status.
 *
 * 1. Register and authenticate as a customer
 * 2. Create a refund request for a delivered order item (using utility function)
 * 3. Retrieve the refund request using the customer connection
 * 4. Validate the response contains correct pending status and related data
 */
export async function test_api_refund_request_retrieve_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create a refund request using utility function
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {},
    );
  typia.assert(refundRequest);
  // 3. Retrieve the refund request by ID
  const retrieved =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate response structure and pending status
  TestValidator.equals(
    "refund request ID matches",
    retrieved.id,
    refundRequest.id,
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "requestedAt is present",
    retrieved.requestedAt !== null && retrieved.requestedAt !== undefined,
  );
  TestValidator.equals(
    "respondedAt is null for pending",
    retrieved.respondedAt,
    null,
  );
  TestValidator.predicate(
    "orderItem exists",
    retrieved.orderItem.id !== null && retrieved.orderItem.id !== undefined,
  );
  TestValidator.equals(
    "orderItem status is delivered",
    retrieved.orderItem.status,
    "delivered",
  );
  TestValidator.predicate(
    "customer exists",
    retrieved.customer.id !== null && retrieved.customer.id !== undefined,
  );
  TestValidator.predicate(
    "createdAt is present",
    retrieved.createdAt !== null && retrieved.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is present",
    retrieved.updatedAt !== null && retrieved.updatedAt !== undefined,
  );
}
