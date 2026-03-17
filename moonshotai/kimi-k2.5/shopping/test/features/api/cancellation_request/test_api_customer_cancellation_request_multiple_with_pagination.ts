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
 * Test listing multiple cancellation requests with pagination.
 * 1. Create customer and authenticate
 * 2. Create order with multiple items via checkout
 * 3. Submit cancellation requests for different order items
 * 4. Call index endpoint with pagination parameters
 * 5. Verify pagination metadata (current page, limit, total records, total pages)
 * 6. Test sorting by created_at to ensure newest requests appear first
 */
export async function test_api_customer_cancellation_request_multiple_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create order with multiple items via checkout
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_customer_checkout_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: null,
          postalCode: RandomGenerator.alphaNumeric(5),
          country: RandomGenerator.pick(["US", "KR", "JP", "UK"]),
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Ensure order has at least 2 items for testing multiple cancellation requests
  TestValidator.predicate(
    "order has at least 2 items",
    order.orderItems.length >= 2,
  );
  // 3. Create multiple cancellation requests for different order items
  const createdRequests = await ArrayUtil.asyncRepeat(2, async (index) => {
    const orderItem = order.orderItems[
      index
    ] as IEcommerceMallOrderItem.ISummary;
    const reason = `Test cancellation reason ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`;
    return generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: reason,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  });
  typia.assert(createdRequests);
  TestValidator.equals("created requests count", createdRequests.length, 2);
  // 4. Test listing with pagination - Page 1 (limit 1)
  const page1 =
    await api.functional.ecommerceMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort: "created_at",
          direction: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page1);
  // 5. Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 1);
  TestValidator.equals("total records", page1.pagination.records, 2);
  TestValidator.equals("total pages calculation", page1.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1.data.length, 1);
  // 6. Test Page 2
  const page2 =
    await api.functional.ecommerceMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 1,
          sort: "created_at",
          direction: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page2);
  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 1);
  TestValidator.equals("page 2 total records", page2.pagination.records, 2);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 2);
  TestValidator.equals("page 2 data length", page2.data.length, 1);
  // 7. Validate sorting by created_at descending (newest first)
  const page1Time = new Date(page1.data[0].createdAt).getTime();
  const page2Time = new Date(page2.data[0].createdAt).getTime();
  TestValidator.predicate(
    "newest first ordering (descending created_at)",
    page1Time >= page2Time,
  );
  // 8. Test with larger limit to get all items in one page
  const allPage =
    await api.functional.ecommerceMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allPage);
  TestValidator.equals("all page data length", allPage.data.length, 2);
  TestValidator.equals("all page records", allPage.pagination.records, 2);
  TestValidator.equals("all page pages", allPage.pagination.pages, 1);
  TestValidator.equals("all page current", allPage.pagination.current, 1);
  TestValidator.equals("all page limit", allPage.pagination.limit, 10);
  // 9. Verify returned data structure
  for (const request of allPage.data) {
    typia.assert(request);
    TestValidator.equals(
      "request customer matches authenticated customer",
      request.customer.id,
      customer.id,
    );
    TestValidator.predicate(
      "request has valid status",
      ["pending", "approved", "rejected"].includes(request.status),
    );
    TestValidator.predicate(
      "request has reason",
      typeof request.reason === "string" && request.reason.length > 0,
    );
  }
}
