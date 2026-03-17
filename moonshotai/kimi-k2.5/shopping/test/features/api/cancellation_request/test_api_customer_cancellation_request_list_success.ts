import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

/**
 * Test customer cancellation request list retrieval success path.
 *
 * Scenario:
 * 1. Authenticate as a customer
 * 2. Create an order via checkout with valid shipping address
 * 3. Submit a cancellation request for one of the order items
 * 4. Call the index endpoint to retrieve cancellation request list
 * 5. Verify the response contains the cancellation request with correct status (pending), reason, and order item details
 * 6. Validate pagination metadata is returned correctly
 */
export async function test_api_customer_cancellation_request_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  typia.assert(authorizedCustomer);
  // Step 2: Create an order via checkout
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: typia.random<string>(),
        recipientPhone: typia.random<string>(),
        streetAddress: typia.random<string>(),
        city: typia.random<string>(),
        state: null,
        postalCode: typia.random<string>(),
        country: typia.random<string>(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item to create cancellation request
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order has no order items");
  }
  // Assert orderItem has required properties
  const orderItemWithId = orderItem as IEcommerceMallOrderItem & { id: string & tags.Format<"uuid"> };
  // Step 3: Create a cancellation request for the order item
  const cancellationReason = "Changed my mind about this purchase";
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemWithId.id,
          reason: cancellationReason,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Step 4: Retrieve cancellation request list via index endpoint
  const cancellationRequestList =
    await api.functional.ecommerceMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          direction: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequestList);
  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    cancellationRequestList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    cancellationRequestList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is at least 1",
    cancellationRequestList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    cancellationRequestList.pagination.pages >= 1,
  );
  // Step 6: Verify the cancellation request is in the list with correct details
  TestValidator.predicate(
    "data array is not empty",
    cancellationRequestList.data.length > 0,
  );
  const foundRequest = cancellationRequestList.data.find(
    (req) => req.id === cancellationRequest.id,
  );
  if (!foundRequest) {
    throw new Error(
      `Created cancellation request ${cancellationRequest.id} not found in list`,
    );
  }
  // Verify cancellation request summary fields
  TestValidator.equals(
    "cancellation request status",
    foundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation request reason",
    foundRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "customer id matches",
    foundRequest.customer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "customer email matches",
    foundRequest.customer.email,
    authorizedCustomer.email,
  );
  TestValidator.equals(
    "order item id matches",
    foundRequest.orderItem.id,
    orderItemWithId.id,
  );
  // Use typia.assert for type narrowing on order item properties
  const orderItemQuantity = (orderItemWithId as any).quantity;
  const orderItemStatus = (orderItemWithId as any).status;
  TestValidator.equals(
    "order item quantity matches",
    foundRequest.orderItem.quantity,
    orderItemQuantity,
  );
  TestValidator.equals(
    "order item status matches",
    foundRequest.orderItem.status,
    orderItemStatus as "paid" | "shipped" | "delivered" | "cancelled" | "refunded" | null | undefined,
  );
  TestValidator.predicate(
    "createdAt is defined",
    foundRequest.createdAt !== null,
  );
}