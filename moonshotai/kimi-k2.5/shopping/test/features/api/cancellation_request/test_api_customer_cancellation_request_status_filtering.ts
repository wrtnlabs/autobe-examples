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

export async function test_api_customer_cancellation_request_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create a customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Create an order via checkout to generate cancellable order items
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.alphabets(8),
        state: RandomGenerator.alphabets(8) satisfies string | null,
        postalCode: String(typia.random<number & tags.Type<"uint32">>()),
        country: RandomGenerator.alphabets(8),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order has at least one order item
  if (order.orderItems.length === 0) {
    throw new Error("Order must have at least one order item for testing");
  }
  // Create multiple cancellation requests with pending status
  const cancellationRequests: IEcommerceMallCancellationRequest[] = [];
  for (const orderItem of order.orderItems.slice(0, 3)) {
    const request =
      await generate_random_ecommerce_mall_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            orderItemId: (orderItem as IEcommerceMallOrderItem & IEntity).id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceMallCancellationRequest.ICreate,
        },
      );
    typia.assert(request);
    cancellationRequests.push(request);
  }
  // Test 1: Filter by pending status
  const pendingResults: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResults);
  // Verify all pending results have pending status
  pendingResults.data.forEach((item) => {
    TestValidator.equals("pending status filter", item.status, "pending");
  });
  // Test 2: Filter by approved status (should return empty in this test setup)
  const approvedResults: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResults);
  // Verify no approved results exist (since seller hasn't approved any)
  TestValidator.equals("approved status empty", approvedResults.data.length, 0);
  // Test 3: Filter by rejected status (should return empty in this test setup)
  const rejectedResults: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResults);
  // Verify no rejected results exist (since seller hasn't rejected any)
  TestValidator.equals("rejected status empty", rejectedResults.data.length, 0);
  // Test 4: Verify customer-specific filtering (no filter = all customer's requests)
  const allResults: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allResults);
  // Verify all requests belong to the authenticated customer
  allResults.data.forEach((item) => {
    TestValidator.equals("customer id matches", item.customer.id, customer.id);
  });
  // Verify pending count matches total created (all start as pending)
  TestValidator.equals(
    "all requests are pending",
    allResults.data.length,
    cancellationRequests.length,
  );
}