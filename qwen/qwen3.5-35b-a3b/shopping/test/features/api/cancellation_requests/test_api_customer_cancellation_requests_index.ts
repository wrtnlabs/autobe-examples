import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_requests_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerData);
  // 2. Create 3 cancellation requests with different statuses
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const pendingRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          order_item_id: orderItemId,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequest);
  const approvedRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
          order_item_id: orderItemId,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequest);
  const rejectedRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
          order_item_id: orderItemId,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequest);
  // 3. Retrieve cancellation requests list for authenticated customer
  const response =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals(
    "pagination total records",
    response.pagination.records,
    3,
  );
  TestValidator.equals("pagination total pages", response.pagination.pages, 3);
  // 5. Validate response has 3 cancellation requests
  TestValidator.equals("cancellation requests count", response.data.length, 3);
  // 6. Validate each cancellation request has required fields
  const statuses: string[] = [];
  for (const request of response.data) {
    statuses.push(request.status);
    // Validate reason exists and is not empty
    TestValidator.predicate(
      "request has reason",
      () => request.reason.length > 0,
    );
    // Validate customer reference fields
    TestValidator.predicate(
      "customer id is valid",
      () => request.customer.id !== "",
    );
    TestValidator.predicate(
      "customer email is valid",
      () => request.customer.email.length > 0,
    );
    // Validate orderItem reference fields
    TestValidator.predicate(
      "orderItem has product_name",
      () => request.orderItem.productName.length > 0,
    );
    TestValidator.predicate(
      "orderItem has product_sku",
      () => request.orderItem.productSku.length > 0,
    );
    TestValidator.predicate(
      "orderItem has variant_name",
      () => request.orderItem.variantName.length > 0,
    );
    // Validate numeric fields
    TestValidator.predicate(
      "orderItem quantity is positive",
      () => request.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "orderItem unitPrice is positive",
      () => request.orderItem.unitPrice > 0,
    );
    TestValidator.predicate(
      "orderItem totalPrice is positive",
      () => request.orderItem.totalPrice > 0,
    );
  }
  // 7. Validate status distribution (1 pending, 1 approved, 1 rejected)
  const pendingCount = statuses.filter((s) => s === "pending").length;
  const approvedCount = statuses.filter((s) => s === "approved").length;
  const rejectedCount = statuses.filter((s) => s === "rejected").length;
  TestValidator.equals("pending status count", pendingCount, 1);
  TestValidator.equals("approved status count", approvedCount, 1);
  TestValidator.equals("rejected status count", rejectedCount, 1);
}
