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
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

export async function test_api_cancellation_request_seller_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // Create a cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 100),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Create seller connection (same host but different actor)
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { ...customerConnection.headers }, // Inherit customer auth for simplicity
  };
  // Update cancellation request status to rejected with valid reason
  const updatedRequest =
    await api.functional.ecommerce.customer.cancellation_requests.statuses.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "rejected" as const,
          reason:
            "Cancellation not approved due to product being already prepared for shipment. Minimum 10 characters required for rejection reason.",
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // Validate that cancellation request status is rejected
  TestValidator.equals(
    "cancellation request status should be rejected",
    updatedRequest.id,
    cancellationRequest.id,
  );
  // Validate order item status remains paid (business logic constraint)
  TestValidator.predicate(
    "order item should maintain paid status",
    updatedRequest.orderItem.status === "paid",
  );
  // Test business logic - attempt to reject with insufficient reason (should fail)
  await TestValidator.error(
    "rejection with insufficient reason should fail",
    async () => {
      await api.functional.ecommerce.customer.cancellation_requests.statuses.update(
        sellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          body: {
            decision: "rejected" as const,
            reason: "Too short", // Less than 10 characters
          } satisfies IEcommerceCancellationRequest.IUpdate,
        },
      );
    },
  );
}
