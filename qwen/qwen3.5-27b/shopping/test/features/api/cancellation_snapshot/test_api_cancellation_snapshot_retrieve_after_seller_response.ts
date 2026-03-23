import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Test that a seller can respond to a cancellation request and the system creates a snapshot.
 * Validates the complete cancellation workflow: customer creates request, seller responds,
 * and the cancellation request state is correctly updated with seller information.
 * Note: Snapshot creation is an internal side-effect; we validate through the updated request state.
 */
export async function test_api_cancellation_snapshot_retrieve_after_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Create cancellation request as customer
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 4. Verify initial state - status is pending, no seller yet
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial seller is null",
    cancellationRequest.seller,
    null,
  );
  TestValidator.equals(
    "initial respondedAt is null",
    cancellationRequest.respondedAt,
    null,
  );
  // 5. Seller approves the cancellation request (triggers snapshot creation)
  const updatedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 6. Validate updated cancellation request state
  TestValidator.equals(
    "status changed to approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "seller information is populated",
    () => updatedRequest.seller !== null,
  );
  if (updatedRequest.seller !== null) {
    TestValidator.equals(
      "seller matches responding seller",
      updatedRequest.seller.id,
      seller.id,
    );
  }
  TestValidator.predicate(
    "respondedAt timestamp is set",
    () => updatedRequest.respondedAt !== null,
  );
  if (updatedRequest.respondedAt !== null) {
    TestValidator.predicate("respondedAt is valid date-time", () => {
      try {
        const date = new Date(updatedRequest.respondedAt!);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    });
  }
  TestValidator.equals(
    "rejection reason is null for approved request",
    updatedRequest.rejectionReason,
    null,
  );
  // 7. Validate that customer and order item information preserved
  TestValidator.equals(
    "customer information preserved",
    updatedRequest.customer.id,
    cancellationRequest.customer.id,
  );
  TestValidator.equals(
    "order item information preserved",
    updatedRequest.orderItem.id,
    cancellationRequest.orderItem.id,
  );
  TestValidator.equals(
    "cancellation reason preserved",
    updatedRequest.reason,
    cancellationRequest.reason,
  );
  // 8. Test rejection workflow with different request
  const rejectionRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(rejectionRequest);
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: rejectionRequest.id,
        body: {
          status: "rejected",
          rejection_reason: "Item already prepared for shipment",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "rejection status is correct",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejection reason is provided",
    () => rejectedRequest.rejectionReason !== null,
  );
  if (rejectedRequest.rejectionReason !== null) {
    TestValidator.equals(
      "rejection reason matches input",
      rejectedRequest.rejectionReason,
      "Item already prepared for shipment",
    );
  }
}
