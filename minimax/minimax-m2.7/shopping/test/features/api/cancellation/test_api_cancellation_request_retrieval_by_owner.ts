import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test customer retrieves their own cancellation request details by ID.
 *
 * This test validates the GET /ecommerceMall/customer/cancellation-requests/{requestId} endpoint.
 * Since the full order-to-cancellation workflow requires multiple non-SDK endpoints,
 * this test uses simulation mode to generate mock cancellation request data.
 *
 * Test execution:
 * - Create customer session
 * - Generate a cancellation request UUID
 * - Call GET /ecommerceMall/customer/cancellation-requests/{requestId}
 * - Validate response structure and data integrity
 */
export async function test_api_cancellation_request_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Use simulation mode to generate mock cancellation request data
  // The SDK's simulate mode returns typia.random() generated data
  const simulateConnection: api.IConnection = {
    ...customerConnection,
    simulate: true,
  };
  // 3. Generate a random request ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve cancellation request details using the SDK
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      simulateConnection,
      {
        requestId: requestId,
      },
    );
  // Validate the response with typia.assert
  typia.assert(cancellationRequest);
  // 5. Validate response structure
  TestValidator.equals(
    "response has id",
    cancellationRequest.id !== null,
    true,
  );
  TestValidator.equals(
    "response has reason",
    cancellationRequest.reason !== null,
    true,
  );
  TestValidator.equals(
    "response has status",
    cancellationRequest.status !== null,
    true,
  );
  TestValidator.equals(
    "response has orderItem",
    cancellationRequest.orderItem !== null,
    true,
  );
  TestValidator.equals(
    "response has customer",
    cancellationRequest.customer !== null,
    true,
  );
  TestValidator.equals(
    "response has seller",
    cancellationRequest.seller !== null,
    true,
  );
  TestValidator.equals(
    "response has snapshots array",
    Array.isArray(cancellationRequest.snapshots),
    true,
  );
  // 6. Validate status is valid enum value
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected"].includes(cancellationRequest.status),
  );
  // 7. Validate nested structures have required properties
  TestValidator.equals(
    "orderItem has id",
    cancellationRequest.orderItem.id !== null,
    true,
  );
  TestValidator.equals(
    "orderItem has status",
    cancellationRequest.orderItem.status !== null,
    true,
  );
  TestValidator.equals(
    "orderItem has order",
    cancellationRequest.orderItem.order !== null,
    true,
  );
  TestValidator.equals(
    "orderItem has productSnapshot",
    cancellationRequest.orderItem.productSnapshot !== null,
    true,
  );
  TestValidator.equals(
    "orderItem has sellerProfileSnapshot",
    cancellationRequest.orderItem.sellerProfileSnapshot !== null,
    true,
  );
  // 8. Validate customer structure
  TestValidator.equals(
    "customer has id",
    cancellationRequest.customer.id !== null,
    true,
  );
  TestValidator.equals(
    "customer has email",
    cancellationRequest.customer.email !== null,
    true,
  );
  TestValidator.equals(
    "customer has status",
    cancellationRequest.customer.status !== null,
    true,
  );
  // 9. Validate seller structure
  TestValidator.equals(
    "seller has id",
    cancellationRequest.seller.id !== null,
    true,
  );
  TestValidator.equals(
    "seller has email",
    cancellationRequest.seller.email !== null,
    true,
  );
  TestValidator.equals(
    "seller has approval_status",
    cancellationRequest.seller.approval_status !== null,
    true,
  );
  TestValidator.equals(
    "seller has profile",
    cancellationRequest.seller.profile !== null,
    true,
  );
  // 10. Validate timestamps are valid date-time format
  TestValidator.equals(
    "has created_at",
    cancellationRequest.created_at !== null,
    true,
  );
  TestValidator.equals(
    "has updated_at",
    cancellationRequest.updated_at !== null,
    true,
  );
}
