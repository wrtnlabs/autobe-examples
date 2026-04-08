import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can view their own refund requests with proper data isolation.
 *
 * Validates the refund request listing functionality for authenticated customers. Ensures that customers can only view their own refund requests and that the response includes all required fields with proper data relationships and pagination metadata.
 *
 * Special attention is given to verifying data isolation (customers cannot see other customers' refund requests), proper null handling for responded_at and seller fields based on request status, and correct pagination structure.
 *
 * 1. Register and authenticate as a customer.
 * 2. Call the refund requests list endpoint with no filters.
 * 3. Verify data isolation - all refund requests belong to the authenticated customer.
 * 4. Verify response structure includes all required fields.
 * 5. Verify null handling for responded_at and seller based on status.
 * 6. Verify pagination metadata is present and valid.
 * 7. Verify default sorting by created_at descending (newest first).
 */
export async function test_api_refund_request_list_customer_own_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Call the refund requests list endpoint with no filters
  const refundRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequests);
  // 3. Verify pagination metadata is present and valid
  TestValidator.predicate(
    "pagination current is positive",
    refundRequests.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    refundRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    refundRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    refundRequests.pagination.pages >= 0,
  );
  // 4. Verify data isolation - all refund requests belong to the authenticated customer
  await ArrayUtil.asyncForEach(refundRequests.data, async (refundRequest) => {
    typia.assert(refundRequest);
    // Verify customer matches authenticated customer
    TestValidator.equals(
      "refund request belongs to authenticated customer",
      refundRequest.customer.id,
      customerAuth.id,
    );
    // Verify required fields are present with valid values
    TestValidator.predicate("has reason text", refundRequest.reason.length > 0);
    TestValidator.predicate(
      "has valid status",
      ["pending", "approved", "rejected"].includes(refundRequest.status),
    );
    // Verify null handling based on status
    if (refundRequest.status === "pending") {
      TestValidator.equals(
        "responded_at is null for pending requests",
        refundRequest.responded_at,
        null,
      );
      TestValidator.equals(
        "seller is null for pending requests",
        refundRequest.seller,
        null,
      );
    } else {
      // For approved or rejected requests
      TestValidator.predicate(
        "responded_at is present for responded requests",
        refundRequest.responded_at !== null,
      );
      TestValidator.predicate(
        "seller is present for responded requests",
        refundRequest.seller !== null,
      );
      // Verify seller information when present
      if (refundRequest.seller !== null) {
        typia.assert(refundRequest.seller);
        TestValidator.predicate(
          "seller has valid email",
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(refundRequest.seller.email),
        );
      }
    }
    // Verify order item details are present and valid
    typia.assert(refundRequest.orderItem);
    TestValidator.predicate(
      "order item has positive quantity",
      refundRequest.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "order item has positive price",
      refundRequest.orderItem.price > 0,
    );
    TestValidator.predicate(
      "order item has valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        refundRequest.orderItem.status,
      ),
    );
    // Verify customer information in refund request
    typia.assert(refundRequest.customer);
    TestValidator.equals(
      "customer email matches",
      refundRequest.customer.email,
      customerAuth.email,
    );
  });
  // 5. Verify default sorting by created_at descending (newest first)
  if (refundRequests.data.length > 1) {
    for (let i = 1; i < refundRequests.data.length; i++) {
      const currentDate = new Date(refundRequests.data[i].created_at).getTime();
      const previousDate = new Date(
        refundRequests.data[i - 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `refund request ${i} is not newer than ${i - 1} (descending order)`,
        currentDate <= previousDate,
      );
    }
  }
}
