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
 * Test that an authenticated administrator can retrieve an approved refund request to verify seller response and complete audit trail.
 *
 * Validates the refund request retrieval endpoint for administrators, ensuring that approved refund requests contain complete information including seller response details, order item status, and audit timestamps.
 *
 * Special attention is given to verifying that approved refund requests contain seller information (not null), order item status reflects 'refunded' state, and responded_at timestamp is populated when the seller responds.
 *
 * 1. Administrator authenticates to access administrator endpoints.
 * 2. Administrator retrieves an approved refund request by its unique identifier.
 * 3. Validates response structure matches IShoppingMallRefundRequest DTO.
 * 4. Verifies refund request status is 'approved'.
 * 5. Confirms seller information is present (not null) for approved requests.
 * 6. Validates order item status changed to 'refunded' upon approval.
 * 7. Ensures responded_at timestamp is populated when seller responds.
 * 8. Verifies customer information and audit trail timestamps are present.
 */
export async function test_api_refund_request_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  // 2. Generate a valid refund request UUID for retrieval
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve approved refund request
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.administrator.refund_requests.at(
      adminConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(refundRequest);
  // 4. Validate refund request ID matches the requested ID
  TestValidator.equals(
    "refund request ID matches",
    refundRequest.id,
    refundRequestId,
  );
  // 5. Validate refund request has reason
  TestValidator.predicate("has reason", refundRequest.reason.length > 0);
  // 6. Validate status is 'approved'
  TestValidator.equals("status is approved", refundRequest.status, "approved");
  // 7. Validate order item status changed to 'refunded' upon approval
  TestValidator.equals(
    "order item status is refunded",
    refundRequest.orderItem.status,
    "refunded",
  );
  // 8. Validate seller information is present (not null for approved requests)
  TestValidator.predicate("seller is present", refundRequest.seller !== null);
  if (refundRequest.seller !== null) {
    typia.assert(refundRequest.seller);
    TestValidator.equals(
      "seller email is valid",
      typeof refundRequest.seller.email,
      "string",
    );
    TestValidator.predicate(
      "seller email has content",
      refundRequest.seller.email.length > 0,
    );
  }
  // 9. Validate customer information
  TestValidator.equals(
    "customer email is valid",
    typeof refundRequest.customer.email,
    "string",
  );
  TestValidator.predicate(
    "customer email has content",
    refundRequest.customer.email.length > 0,
  );
  // 10. Validate created_at timestamp
  TestValidator.predicate(
    "created_at is valid",
    refundRequest.created_at.length > 0,
  );
  // 11. Validate responded_at timestamp is populated (not null for approved requests)
  TestValidator.predicate(
    "responded_at is populated",
    refundRequest.responded_at !== null,
  );
  if (refundRequest.responded_at !== null) {
    TestValidator.predicate(
      "responded_at is valid",
      refundRequest.responded_at.length > 0,
    );
  }
  // 12. Validate updated_at timestamp
  TestValidator.predicate(
    "updated_at is valid",
    refundRequest.updated_at.length > 0,
  );
  // 13. Validate order item contains required fields
  TestValidator.predicate(
    "order item has valid quantity",
    refundRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has valid price",
    refundRequest.orderItem.price > 0,
  );
  // 14. Validate product variant information in order item
  TestValidator.predicate(
    "product variant has SKU code",
    refundRequest.orderItem.productVariant.sku_code.length > 0,
  );
  // 15. Validate order information in order item
  TestValidator.predicate(
    "order has valid order number",
    refundRequest.orderItem.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has valid total price",
    refundRequest.orderItem.order.total_price > 0,
  );
}
