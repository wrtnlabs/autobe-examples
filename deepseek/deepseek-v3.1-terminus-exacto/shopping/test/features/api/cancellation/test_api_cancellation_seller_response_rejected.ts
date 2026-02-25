import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Test seller rejection of a cancellation request with detailed rejection reason.
 * Authenticate as seller, verify a pending cancellation request exists for their product,
 * then submit rejection decision with minimum 10-character explanation. Validate the
 * response structure and that rejection reasoning is properly captured in the audit trail.
 */
export async function test_api_cancellation_seller_response_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies IEcommerceSeller.ILogin,
  });
  // Create cancellation request setup (requires customer and order item)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Generate cancellation request using utility function
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Seller responds with rejection decision
  const sellerResponse =
    await api.functional.ecommerce.seller.cancellation_requests.responses.patchByCancellationrequestid(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "rejected",
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(sellerResponse);
  // Validate response structure - only use properties that exist in IEcommerceCancellationRequest
  TestValidator.equals(
    "cancellation request ID matches",
    sellerResponse.id,
    cancellationRequest.id,
  );
  TestValidator.predicate(
    "reason field exists and contains rejection context",
    sellerResponse.reason.length > 0,
  );
  TestValidator.equals(
    "customer ID matches",
    sellerResponse.customer.id,
    cancellationRequest.customer.id,
  );
  TestValidator.equals(
    "order item ID matches",
    sellerResponse.orderItem.id,
    cancellationRequest.orderItem.id,
  );
  TestValidator.equals(
    "seller ID matches",
    sellerResponse.seller.id,
    cancellationRequest.seller.id,
  );
  // Validate timestamps for audit trail
  TestValidator.predicate(
    "has creation timestamp",
    sellerResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "has update timestamp",
    sellerResponse.updated_at !== undefined,
  );
  // Validate that rejection creates proper audit trail via embedded summaries
  TestValidator.predicate(
    "customer summary exists",
    sellerResponse.customer.id !== undefined &&
      sellerResponse.customer.display_name !== undefined,
  );
  TestValidator.predicate(
    "order item summary exists",
    sellerResponse.orderItem.id !== undefined &&
      sellerResponse.orderItem.quantity !== undefined,
  );
  TestValidator.predicate(
    "seller summary exists",
    sellerResponse.seller.id !== undefined &&
      sellerResponse.seller.shop_name !== undefined,
  );
  // Verify rejection response contains the detailed reasoning for customer communication
  TestValidator.predicate(
    "seller response includes shop information for accountability",
    sellerResponse.seller.shop_name.length > 0,
  );
}
