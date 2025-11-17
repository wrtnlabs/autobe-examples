import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";

export async function test_api_shopping_mall_customer_refund_request_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer account to obtain valid authentication token
  const createCustomerBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "SecureP@ssword123",
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;
  const authCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createCustomerBody,
    });
  typia.assert(authCustomer);

  // 2. As the API to create refund request is missing, simulate a refund request with realistic data
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const refundRequest: IShoppingMallRefundRequest = {
    id: refundRequestId,
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    refund_amount: 5000,
    refund_reason: "Product not as described",
    refund_status: "pending",
    requested_at: new Date().toISOString(),
    processed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 3. Retrieve the refund request by ID using customer auth context
  const retrieved: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.refundRequests.at(connection, {
      refundRequestId: refundRequestId,
    });
  typia.assert(retrieved);

  // 4. Check that the retrieved ID matches the request ID
  TestValidator.equals(
    "retrieved refund request ID should match",
    retrieved.id,
    refundRequestId,
  );

  // 5. Validate key refund request properties are returned
  TestValidator.predicate(
    "refund amount should be positive",
    retrieved.refund_amount > 0,
  );
  TestValidator.predicate(
    "refund reason should be non-empty",
    retrieved.refund_reason.length > 0,
  );
  TestValidator.equals(
    "refund status should be pending",
    retrieved.refund_status,
    "pending",
  );
  TestValidator.predicate(
    "requested_at is ISO string",
    typeof retrieved.requested_at === "string" &&
      retrieved.requested_at.length > 0,
  );

  // 6. Attempt to access the refund request by a different authenticated customer to verify authorization
  const otherCustomerBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "SafePass456",
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;
  const otherAuthCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerBody,
    });
  typia.assert(otherAuthCustomer);

  // Simulate authorization failure by attempting to retrieve refund with a different customer token
  // Expect that unauthorized access error will occur
  await TestValidator.error(
    "other customer cannot retrieve refund request they do not own",
    async () => {
      await api.functional.shoppingMall.customer.refundRequests.at(connection, {
        refundRequestId: refundRequestId,
      });
    },
  );
}
