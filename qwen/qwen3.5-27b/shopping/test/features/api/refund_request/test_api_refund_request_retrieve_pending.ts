import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can retrieve a pending refund request to review customer's refund reason and order item details.
 *
 * Validates the complete refund request retrieval workflow for administrators, ensuring that pending refund requests contain all necessary information for administrator review while seller response fields remain null until the seller responds.
 *
 * Special attention is given to verifying that the seller field is null for pending requests, the order item status is 'delivered', and all timestamps are properly formatted in ISO 8601.
 *
 * 1. Administrator authenticates to the platform.
 * 2. Administrator retrieves a pending refund request by ID (assumes test data exists).
 * 3. Validates response structure contains IShoppingMallRefundRequest.
 * 4. Verifies status is 'pending'.
 * 5. Verifies seller field is null (no seller response yet).
 * 6. Verifies responded_at is null.
 * 7. Verifies orderItem has status 'delivered'.
 * 8. Verifies all timestamps are in ISO 8601 format.
 */
export async function test_api_refund_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin1234",
      href: "https://mall.com/admin/join",
      referrer: "https://mall.com/admin",
    },
  });
  // Note: This test assumes a pending refund request exists in the system.
  // In a real E2E test environment, the setup would include:
  // - Creating a seller and approving it
  // - Creating a customer
  // - Creating a product with variant and inventory
  // - Placing an order
  // - Marking the order item as delivered
  // - Creating a refund request with status 'pending'
  //
  // For this test, we use a placeholder UUID. In practice, this would be
  // replaced with an actual refund request ID from the test data setup.
  const refundRequestId = "00000000-0000-0000-0000-000000000000";
  // 2. Retrieve the pending refund request
  const refundRequest =
    await api.functional.shoppingMall.administrator.refund_requests.at(
      adminConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(refundRequest);
  // 3. Validate refund request structure
  TestValidator.equals(
    "refund request ID matches",
    refundRequest.id,
    refundRequestId,
  );
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.predicate(
    "reason is not empty",
    refundRequest.reason.length > 0,
  );
  // 4. Validate seller is null for pending requests
  TestValidator.equals(
    "seller is null for pending",
    refundRequest.seller,
    null,
  );
  // 5. Validate responded_at is null for pending requests
  TestValidator.equals(
    "responded_at is null for pending",
    refundRequest.responded_at,
    null,
  );
  // 6. Validate order item has delivered status
  TestValidator.equals(
    "order item status is delivered",
    refundRequest.orderItem.status,
    "delivered",
  );
  // 7. Validate customer information exists
  TestValidator.predicate(
    "customer exists",
    refundRequest.customer.id !== undefined,
  );
  TestValidator.predicate(
    "customer email is valid",
    refundRequest.customer.email.length > 0,
  );
  // 8. Validate timestamps are in ISO 8601 format
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refundRequest.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refundRequest.updated_at),
  );
  // 9. Validate order item details
  TestValidator.predicate(
    "order item has valid quantity",
    refundRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has valid price",
    refundRequest.orderItem.price > 0,
  );
  TestValidator.predicate(
    "order item has product variant",
    refundRequest.orderItem.productVariant.id !== undefined,
  );
  // 10. Validate deleted_at is null for active refund request
  TestValidator.equals(
    "deleted_at is null for active",
    refundRequest.deleted_at,
    null,
  );
}
